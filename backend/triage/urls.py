"""URL configuration for the triage application.

This module defines the API routes for looking up books, managing catalog
entries, and retrieving dashboard statistics.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from triage.views import BookLookupView, CatalogEntryViewSet, DashboardStatsView

router = DefaultRouter()
router.register(r"entries", CatalogEntryViewSet, basename="catalog-entries")

urlpatterns = [
    path("lookup/<str:isbn>/", BookLookupView.as_view(), name="book-lookup"),
    path("stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("", include(router.urls)),
]
