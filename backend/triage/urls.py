"""URL configuration for the triage application.

This module defines the API routes for looking up books, managing catalog
entries, and retrieving dashboard statistics.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from triage.views import BookLookupView, CatalogEntryViewSet, CullingGoalViewSet, DashboardStatsView, RecommendView

router = DefaultRouter()
router.register(r"entries", CatalogEntryViewSet, basename="catalog-entries")
router.register(r"goals", CullingGoalViewSet, basename="culling-goals")

urlpatterns = [
    path("lookup/<str:isbn>/", BookLookupView.as_view(), name="book-lookup"),
    path("recommend/", RecommendView.as_view(), name="recommend"),
    path("stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("", include(router.urls)),
]
