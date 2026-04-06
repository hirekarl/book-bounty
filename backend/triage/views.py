"""Views for the triage application.

This module defines the API views for looking up books, managing catalog
entries, and retrieving dashboard statistics.
"""

from django.db import models
from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from triage.models import CatalogEntry
from triage.serializers import BookSerializer, CatalogEntrySerializer
from triage.services import get_or_create_book


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
        serializer = BookSerializer(book)
        return Response(serializer.data)


class CatalogEntryViewSet(viewsets.ModelViewSet[CatalogEntry]):
    """ViewSet for managing CatalogEntry records."""

    queryset = CatalogEntry.objects.all().order_by("-created_at")
    serializer_class = CatalogEntrySerializer

    def get_queryset(self) -> models.QuerySet[CatalogEntry]:
        """Optionally filters entries by status."""
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
        return queryset

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
        """Retrieves counts of catalog entries grouped by status.

        Args:
            _request: The API request.

        Returns:
            A Response containing the statistics counts.
        """
        stats = (
            CatalogEntry.objects.values("status")
            .annotate(count=Count("status"))
            .order_by("status")
        )

        # Convert to a more convenient dictionary
        # e.g., {"KEEP": 5, "DONATE": 2, ...}
        stats_dict = {
            CatalogEntry.Status.KEEP: 0,
            CatalogEntry.Status.DONATE: 0,
            CatalogEntry.Status.SELL: 0,
            CatalogEntry.Status.DISCARD: 0,
        }
        for item in stats:
            stats_dict[item["status"]] = item["count"]

        return Response(stats_dict)
