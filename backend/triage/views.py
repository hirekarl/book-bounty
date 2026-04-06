"""Views for the triage application.

This module defines the API views for looking up books, managing catalog
entries, and retrieving dashboard statistics.
"""

from django.db import models
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from triage.ai_engine import get_ai_recommendation
from triage.models import CatalogEntry, CullingGoal
from triage.serializers import BookSerializer, CatalogEntrySerializer, CullingGoalSerializer
from triage.services import get_or_create_book


class CullingGoalViewSet(viewsets.ModelViewSet):
    """ViewSet for managing CullingGoal records."""

    queryset = CullingGoal.objects.all().order_by("-created_at")
    serializer_class = CullingGoalSerializer

    def perform_update(self, serializer: CullingGoalSerializer) -> None:
        """Ensures only one goal is active at a time."""
        instance = serializer.save()
        if instance.is_active:
            CullingGoal.objects.exclude(pk=instance.pk).update(is_active=False)


class RecommendView(APIView):
    """Calls the AI engine to generate a triage recommendation for a book."""

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
            goal = CullingGoal.objects.filter(pk=culling_goal_id).first()
        else:
            goal = CullingGoal.objects.filter(is_active=True).first()

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

        try:
            recommendation = get_ai_recommendation(goal.description, book_metadata, condition)
        except Exception as exc:
            return Response(
                {"error": f"AI engine error: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(recommendation.model_dump(), status=status.HTTP_200_OK)


class BookLookupView(APIView):
    """View to handle ISBN lookup and metadata fetching."""

    def get(self, _request: Request, isbn: str) -> Response:
        """Looks up a book by ISBN, fetching and caching if necessary.

        Args:
            _request: The API request.
            isbn: The ISBN string.

        Returns:
            A Response containing the serialized Book metadata.
        """
        book, _ = get_or_create_book(isbn)
        data = dict(BookSerializer(book).data)
        data["metadata_found"] = not (book.title == "Unknown Book" and book.author == "Unknown")
        return Response(data)


class CatalogEntryViewSet(viewsets.ModelViewSet[CatalogEntry]):
    """ViewSet for managing CatalogEntry records."""

    queryset = CatalogEntry.objects.all().select_related("book").order_by("-created_at")
    serializer_class = CatalogEntrySerializer

    def get_queryset(self) -> models.QuerySet[CatalogEntry]:
        """Filters entries by status, resolved state, search query, or in-collection view."""
        queryset = super().get_queryset()

        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        search_query = self.request.query_params.get("search")
        if search_query:
            queryset = (
                queryset.filter(book__title__icontains=search_query)
                | queryset.filter(book__author__icontains=search_query)
            )

        resolved_filter = self.request.query_params.get("resolved")
        if resolved_filter == "true":
            queryset = queryset.filter(resolved_at__isnull=False)
        elif resolved_filter == "false":
            queryset = queryset.filter(resolved_at__isnull=True)

        if self.request.query_params.get("in_collection") == "true":
            # Unresolved entries are still physically present; resolved KEEPs stay forever.
            queryset = queryset.filter(
                Q(resolved_at__isnull=True) | Q(status=CatalogEntry.Status.KEEP)
            )

        return queryset

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

        updated_count = CatalogEntry.objects.filter(id__in=entry_ids).update(
            status=new_status,
        )
        return Response({"updated_count": updated_count}, status=status.HTTP_200_OK)


class DashboardStatsView(APIView):
    """View to retrieve dashboard statistics."""

    def get(self, _request: Request) -> Response:
        """Retrieves dashboard statistics using efficient aggregation.

        Returns:
            active:       counts of unresolved entries per status
            resolved:     counts of resolved entries per status
            in_collection: total books physically present
        """
        # Efficiently calculate all counts in a single pass using conditional aggregation
        stats_agg = CatalogEntry.objects.aggregate(
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
            }
        )
