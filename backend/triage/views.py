"""Views for the triage application.

This module defines the API views for looking up books, managing catalog
entries, and retrieving dashboard statistics.
"""

import logging
import re

import requests
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Count, F, FloatField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from triage.ai_engine import (
    get_ai_recommendation,
    get_bulk_ai_recommendation,
    get_impact_narrative,
)
from triage.models import CatalogEntry, CullingGoal
from triage.serializers import (
    BookSerializer,
    CatalogEntrySerializer,
    CullingGoalSerializer,
)
from triage.services import (
    fetch_valuation_data,
    get_or_create_book,
    search_books_by_title_author,
)

logger = logging.getLogger(__name__)


class RegistrationRateThrottle(AnonRateThrottle):
    """Limits registration attempts to the 'registration' scope (10/hour)."""

    scope = "registration"


class AiRecommendationRateThrottle(UserRateThrottle):
    """Limits AI recommendation calls to the 'ai_recommendation' scope (100/day)."""

    scope = "ai_recommendation"


class RegisterView(APIView):
    """Creates a new user account and returns an auth token."""

    permission_classes = [AllowAny]
    throttle_classes = [RegistrationRateThrottle]

    def post(self, request: Request) -> Response:
        """Registers a new user.

        Expected payload:
            {
                "username": "alice",
                "password1": "securepass123",
                "password2": "securepass123",
                "email": "alice@example.com"  // optional
            }

        Returns:
            {"key": "<auth token>"} on success.
        """
        username = request.data.get("username", "").strip()
        password1 = request.data.get("password1", "")
        password2 = request.data.get("password2", "")
        email = request.data.get("email", "").strip()

        errors: dict = {}

        if not username:
            errors["username"] = ["This field is required."]
        elif User.objects.filter(username=username).exists():
            errors["username"] = ["A user with that username already exists."]

        if not password1:
            errors["password1"] = ["This field is required."]
        elif password1 != password2:
            errors["password2"] = ["Passwords do not match."]
        else:
            try:
                validate_password(password1)
            except ValidationError as exc:
                errors["password1"] = list(exc.messages)

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password1, email=email)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"key": token.key}, status=status.HTTP_201_CREATED)


class CatalogEntryPagination(PageNumberPagination):
    """Pagination class for CatalogEntry list responses."""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class CullingGoalViewSet(viewsets.ModelViewSet):
    """ViewSet for managing CullingGoal records."""

    queryset = CullingGoal.objects.none()
    serializer_class = CullingGoalSerializer

    def get_queryset(self) -> models.QuerySet[CullingGoal]:
        """Returns goals belonging to the current user."""
        return CullingGoal.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer: CullingGoalSerializer) -> None:
        """Associates the new goal with the current user."""
        serializer.save(user=self.request.user)

    def perform_update(self, serializer: CullingGoalSerializer) -> None:
        """Ensures only one of this user's goals is active at a time."""
        with transaction.atomic():
            instance = serializer.save()
            if instance.is_active:
                CullingGoal.objects.filter(user=self.request.user).exclude(pk=instance.pk).update(is_active=False)


class RecommendView(APIView):
    """Calls the AI engine to generate a triage recommendation for a book."""

    throttle_classes = [AiRecommendationRateThrottle]

    def post(self, request: Request) -> Response:
        """Returns a structured AI recommendation.

        Expected payload:
            {
                "isbn": "9780374528379",
                "culling_goal_id": 1,        // optional; falls back to active goal
                "condition_grade": "GOOD",   // optional; defaults to GOOD
                "condition_flags": []        // optional
            }
        """
        isbn = request.data.get("isbn")
        if not isbn:
            return Response({"error": "isbn is required"}, status=status.HTTP_400_BAD_REQUEST)

        culling_goal_id = request.data.get("culling_goal_id")
        if culling_goal_id:
            goal = CullingGoal.objects.filter(pk=culling_goal_id, user=request.user).first()
        else:
            goal = CullingGoal.objects.filter(is_active=True, user=request.user).first()

        if not goal:
            return Response(
                {"error": "No active culling goal found. Please set a culling goal first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        book, _ = get_or_create_book(isbn)

        book_metadata = {
            "title": book.title,
            "author": book.author,
            "year": book.publish_year,
            "subjects": book.subjects,
            "description": book.description,
        }
        condition = {
            "grade": request.data.get("condition_grade", "GOOD"),
            "flags": request.data.get("condition_flags", []),
        }

        valuation_data = fetch_valuation_data(isbn)

        try:
            recommendation = get_ai_recommendation(
                goal.description, book_metadata, condition, valuation_data=valuation_data,
            )
        except Exception:
            return Response(
                {"error": "AI recommendation service is unavailable. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        data = recommendation.model_dump(mode="json")
        data["valuation_data"] = valuation_data
        return Response(data, status=status.HTTP_200_OK)


class BookLookupView(APIView):
    """View to handle ISBN lookup and metadata fetching."""

    _ISBN_RE = re.compile(r"^(\d{9}[\dX]|\d{13})$")

    def get(self, _request: Request, isbn: str) -> Response:
        """Looks up a book by ISBN, fetching and caching if necessary.

        Args:
            _request: The API request.
            isbn: The ISBN string.

        Returns:
            A Response containing the serialized Book metadata.
        """
        if not self._ISBN_RE.match(isbn):
            return Response(
                {"error": "Invalid ISBN format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            book, _ = get_or_create_book(isbn)
        except requests.RequestException:
            return Response(
                {"error": "Book metadata service is temporarily unavailable."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        data = dict(BookSerializer(book).data)
        data["metadata_found"] = not (book.title == "Unknown Book" and book.author == "Unknown")
        return Response(data)


class BookSearchView(APIView):
    """Searches Open Library by title and/or author for disambiguation."""

    def get(self, request: Request) -> Response:
        """Returns a list of candidate books matching the query.

        Query params:
            title: Book title (optional but at least one of title/author required)
            author: Author name (optional)
        """
        title = request.query_params.get("title", "").strip()
        author = request.query_params.get("author", "").strip()

        if not title and not author:
            return Response(
                {"error": "At least one of title or author is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            results = search_books_by_title_author(title, author)
        except requests.RequestException:
            return Response(
                {"error": "Book search is temporarily unavailable."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(results, status=status.HTTP_200_OK)


class CatalogEntryViewSet(viewsets.ModelViewSet[CatalogEntry]):
    """ViewSet for managing CatalogEntry records."""

    queryset = CatalogEntry.objects.none()
    serializer_class = CatalogEntrySerializer
    pagination_class = CatalogEntryPagination

    def list(self, request: Request, *args: object, **kwargs: object) -> Response:
        """Returns a paginated list of catalog entries."""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def get_queryset(self) -> models.QuerySet[CatalogEntry]:
        """Filters entries by status, resolved state, search query, or in-collection view."""
        queryset = CatalogEntry.objects.filter(user=self.request.user).select_related("book").order_by("-created_at")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        search_query = self.request.query_params.get("search")
        if search_query:
            queryset = (
                queryset.filter(book__title__icontains=search_query)
                | queryset.filter(book__author__icontains=search_query)
            ).distinct()

        resolved_filter = self.request.query_params.get("resolved")
        if resolved_filter == "true":
            queryset = queryset.filter(resolved_at__isnull=False)
        elif resolved_filter == "false":
            queryset = queryset.filter(resolved_at__isnull=True)

        if self.request.query_params.get("in_collection") == "true":
            # Unresolved entries are still physically present; resolved KEEPs stay forever.
            queryset = queryset.filter(
                Q(resolved_at__isnull=True) | Q(status=CatalogEntry.Status.KEEP),
            )

        return queryset

    def perform_create(self, serializer: CatalogEntrySerializer) -> None:
        """Saves the entry, extracting marketplace_description and valuation_data if needed."""
        ai_rec = self.request.data.get("ai_recommendation")
        marketplace_description = self.request.data.get("marketplace_description")
        valuation_data = self.request.data.get("valuation_data") or {}

        # If not provided directly but exists in AI rec, pull it forward
        if not marketplace_description and isinstance(ai_rec, dict):
            marketplace_description = ai_rec.get("marketplace_description")

        save_kwargs: dict = {"user": self.request.user}
        if marketplace_description:
            save_kwargs["marketplace_description"] = marketplace_description
        if valuation_data:
            save_kwargs["valuation_data"] = valuation_data
        serializer.save(**save_kwargs)

    def perform_update(self, serializer: CatalogEntrySerializer) -> None:
        """Updates the entry, extracting marketplace_description if needed."""
        ai_rec = self.request.data.get("ai_recommendation")
        marketplace_description = self.request.data.get("marketplace_description")

        # If not provided directly but exists in AI rec, pull it forward
        if not marketplace_description and isinstance(ai_rec, dict):
            marketplace_description = ai_rec.get("marketplace_description")

        if marketplace_description:
            serializer.save(marketplace_description=marketplace_description)
        else:
            serializer.save()

    @action(detail=True, methods=["post"])
    def resolve(self, request: Request, pk: int | None = None) -> Response:
        """Marks a catalog entry as resolved (action completed).

        Sets resolved_at to the current timestamp. Idempotent — resolving
        an already-resolved entry returns 400.
        """
        entry = self.get_object()
        if entry.resolved_at is not None:
            return Response(
                {"error": "Entry is already resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        entry.resolved_at = timezone.now()
        entry.save(update_fields=["resolved_at", "updated_at"])
        return Response(CatalogEntrySerializer(entry).data)

    @action(detail=False, methods=["patch"])
    def bulk_update_status(self, request: Request) -> Response:
        """Updates the status of multiple catalog entries at once.

        Expected payload: {"ids": [1, 2, 3], "status": "KEEP"}
        """
        entry_ids = request.data.get("ids", [])
        new_status = request.data.get("status")

        if not entry_ids or not new_status:
            return Response(
                {"error": "Missing ids or status"}, status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status not in CatalogEntry.Status.values:
            return Response(
                {"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST,
            )

        updated_count = CatalogEntry.objects.filter(id__in=entry_ids, user=request.user).update(
            status=new_status,
        )
        return Response({"updated_count": updated_count}, status=status.HTTP_200_OK)


class DashboardStatsView(APIView):
    """View to retrieve dashboard statistics."""

    def get(self, request: Request) -> Response:
        """Retrieves dashboard statistics using efficient aggregation.

        Returns:
            active:       counts of unresolved entries per status
            resolved:     counts of resolved entries per status
            in_collection: total books physically present
        """
        # Efficiently calculate all counts in a single pass using conditional aggregation
        stats_agg = CatalogEntry.objects.filter(user=request.user).aggregate(
            **{
                f"active_{s}": Count("id", filter=Q(status=s, resolved_at__isnull=True))
                for s in CatalogEntry.Status.values
            },
            **{
                f"resolved_{s}": Count("id", filter=Q(status=s, resolved_at__isnull=False))
                for s in CatalogEntry.Status.values
            },
            in_collection=Count(
                "id",
                filter=Q(resolved_at__isnull=True) | Q(status=CatalogEntry.Status.KEEP),
            ),
        )

        active = {s: stats_agg[f"active_{s}"] for s in CatalogEntry.Status.values}
        resolved = {s: stats_agg[f"resolved_{s}"] for s in CatalogEntry.Status.values}

        return Response(
            {
                "active": active,
                "resolved": resolved,
                "in_collection": stats_agg["in_collection"],
            },
        )


class RecommendBulkView(APIView):
    """Calls the AI engine to generate recommendations for multiple catalog entries."""

    throttle_classes = [AiRecommendationRateThrottle]

    def post(self, request: Request) -> Response:
        """Returns structured AI recommendations for multiple entries.

        Expected payload:
            {
                "entry_ids": [1, 2, 3],
                "culling_goal_id": 1        // optional; falls back to active goal
            }
        """
        entry_ids = request.data.get("entry_ids", [])
        if not entry_ids:
            return Response(
                {"error": "entry_ids is required"}, status=status.HTTP_400_BAD_REQUEST,
            )

        culling_goal_id = request.data.get("culling_goal_id")
        if culling_goal_id:
            goal = CullingGoal.objects.filter(pk=culling_goal_id, user=request.user).first()
        else:
            goal = CullingGoal.objects.filter(is_active=True, user=request.user).first()

        if not goal:
            return Response(
                {"error": "No active culling goal found. Please set a culling goal first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Fetch entries efficiently, ensuring they aren't already resolved
        entries = CatalogEntry.objects.filter(
            id__in=entry_ids, resolved_at__isnull=True, user=request.user,
        ).select_related("book")

        if not entries.exists():
            return Response(
                {"error": "No valid unresolved entries found for the provided IDs."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valuation_map = {
            entry.id: fetch_valuation_data(entry.book.isbn) for entry in entries
        }

        try:
            bulk_recommendation = get_bulk_ai_recommendation(
                list(entries), goal, valuation_map=valuation_map,
            )
        except Exception:
            return Response(
                {"error": "AI recommendation service is unavailable. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Map back to entry IDs as requested
        results = {
            rec.catalog_entry_id: rec.model_dump(mode="json", exclude={"catalog_entry_id"})
            for rec in bulk_recommendation.recommendations
        }

        # Validate that the AI returned recommendations for all requested entry IDs
        fetched_entry_ids = set(entries.values_list("id", flat=True))
        returned_ids = set(results.keys())
        missing_ids = fetched_entry_ids - returned_ids
        if missing_ids:
            return Response(
                {
                    "error": (
                        "AI response is incomplete. Missing recommendations for entry IDs: "
                        f"{sorted(missing_ids)}"
                    ),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(results, status=status.HTTP_200_OK)


class ValuationView(APIView):
    """Fetch or refresh market valuation data for a catalog entry."""

    def post(self, request: Request, pk: int) -> Response:
        """Fetches market valuation data for the given entry and persists it."""
        entry = get_object_or_404(CatalogEntry.objects.select_related("book"), pk=pk, user=request.user)
        valuation_data = fetch_valuation_data(entry.book.isbn)
        entry.valuation_data = valuation_data
        entry.save(update_fields=["valuation_data", "updated_at"])
        return Response(valuation_data, status=status.HTTP_200_OK)


class DashboardImpactView(APIView):
    """View to retrieve impact metrics for the shelf dashboard."""

    def get(self, request: Request) -> Response:
        """Calculates and returns shelf impact aggregations.

        Metrics:
            total_resolved_books: Count of all entries with resolved_at.
            total_recovered_inches: Sum of spatial ROI for DONATE, SELL, DISCARD resolved entries.
            total_potential_earnings: Sum of asking_price for SELL resolved entries.
            top_donation_destinations: Frequency of donation_dest for DONATE resolved entries.
            impact_narrative: AI-generated progress summary.
        """
        resolved_entries = CatalogEntry.objects.filter(
            resolved_at__isnull=False, user=request.user,
        ).select_related("book")

        total_resolved_books = resolved_entries.count()

        # Efficiently get resolved counts per status
        resolved_counts = {
            s: resolved_entries.filter(status=s).count() for s in CatalogEntry.Status.values
        }

        # Recovered inches: DONATE, SELL, DISCARD
        # calculate_spatial_roi formula: (page_count / 100.0) * 0.25 = page_count * 0.0025
        # NULL page_count defaults to 1.0 inch per the original function.
        removed_entries = resolved_entries.filter(
            status__in=[
                CatalogEntry.Status.DONATE,
                CatalogEntry.Status.SELL,
                CatalogEntry.Status.DISCARD,
            ],
        )

        agg = removed_entries.aggregate(
            total=Sum(
                Coalesce(F("book__page_count") * Value(0.0025), Value(1.0)),
                output_field=FloatField(),
            ),
        )
        total_recovered_inches = agg["total"] or 0.0

        # Potential earnings: Sum of asking_price for SELL
        total_potential_earnings = (
            resolved_entries.filter(status=CatalogEntry.Status.SELL).aggregate(
                total=Sum("asking_price"),
            )["total"]
            or 0.0
        )

        # Top donation destinations
        top_donation_destinations = (
            resolved_entries.filter(status=CatalogEntry.Status.DONATE)
            .exclude(donation_dest="")
            .values("donation_dest")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        # AI Impact Narrative
        try:
            impact_narrative = get_impact_narrative(
                {
                    "resolved_counts": resolved_counts,
                    "space_saved": round(total_recovered_inches / 12, 2),  # in feet
                    "money_earned": float(total_potential_earnings),
                },
            ).win_summary
        except Exception:
            logger.warning("Failed to generate impact narrative", exc_info=True)
            impact_narrative = ""

        return Response(
            {
                "total_resolved_books": total_resolved_books,
                "total_recovered_inches": round(total_recovered_inches, 2),
                "total_potential_earnings": float(total_potential_earnings),
                "top_donation_destinations": list(top_donation_destinations),
                "impact_narrative": impact_narrative,
            },
        )
