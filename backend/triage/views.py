"""Views for the triage application.

This module defines the API views for looking up books, managing catalog
entries, and retrieving dashboard statistics.
"""

from django.db import models
from django.db.models import Count
from rest_framework import viewsets
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
