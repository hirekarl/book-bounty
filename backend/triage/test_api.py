"""Tests for the triage API endpoints.

This module contains integration tests to verify the behavior of the API
endpoints for looking up books, managing catalog entries, and retrieving
dashboard statistics.
"""

from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from triage.models import Book, CatalogEntry


class BaseAPITestCase(APITestCase):
    """Base class for API tests with authentication setup."""

    def setUp(self) -> None:
        """Sets up a test user and token authentication."""
        self.user = User.objects.create_user(username="testuser", password="password")
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")


class APITests(BaseAPITestCase):
    """Test suite for the triage API endpoints."""

    def setUp(self) -> None:
        """Set up test data for the API tests."""
        super().setUp()
        self.book = Book.objects.create(
            isbn="1234567890",
            title="Test Book",
            author="Test Author",
            publish_year=2024,
            page_count=200,
        )
        self.entry = CatalogEntry.objects.create(
            book=self.book,
            status=CatalogEntry.Status.KEEP,
            condition_flags=[],
            notes="A kept book.",
        )

    @patch("triage.services.fetch_book_metadata")
    def test_book_lookup(self, mock_fetch: MagicMock) -> None:
        """Test the ISBN lookup endpoint."""
        # Test lookup for existing book
        url = reverse("book-lookup", kwargs={"isbn": "1234567890"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Test Book")
        self.assertEqual(response.data["page_count"], 200)
        mock_fetch.assert_not_called()

        # Test lookup for new book
        mock_fetch.return_value = {
            "title": "New Book",
            "author": "New Author",
            "publish_year": 2023,
            "subjects": [],
            "cover_url": None,
            "description": "",
            "page_count": 350,
        }
        url = reverse("book-lookup", kwargs={"isbn": "0987654321"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "New Book")
        self.assertEqual(response.data["page_count"], 350)
        self.assertTrue(Book.objects.filter(isbn="0987654321").exists())

    def test_list_entries(self) -> None:
        """Test listing catalog entries."""
        url = reverse("catalog-entries-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["book"]["title"], "Test Book")

    def test_create_entry(self) -> None:
        """Test creating a new catalog entry."""
        new_book = Book.objects.create(
            isbn="111", title="Another Book", author="Author",
        )
        url = reverse("catalog-entries-list")
        data = {
            "book_id": new_book.id,
            "status": CatalogEntry.Status.SELL,
            "asking_price": "25.00",
            "notes": "To be sold.",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            CatalogEntry.objects.filter(
                book=new_book, status=CatalogEntry.Status.SELL,
            ).exists()
        )

    def test_dashboard_stats(self) -> None:
        """Test the dashboard statistics endpoint."""
        # Add another entry to change stats
        another_book = Book.objects.create(isbn="222", title="B2", author="A2")
        CatalogEntry.objects.create(book=another_book, status=CatalogEntry.Status.SELL)

        url = reverse("dashboard-stats")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Updated structure check
        self.assertEqual(response.data["active"][CatalogEntry.Status.KEEP], 1)
        self.assertEqual(response.data["active"][CatalogEntry.Status.SELL], 1)
        self.assertEqual(response.data["active"][CatalogEntry.Status.DONATE], 0)
        self.assertEqual(response.data["active"][CatalogEntry.Status.DISCARD], 0)
        self.assertEqual(response.data["in_collection"], 2)

    def test_filter_entries(self) -> None:
        """Test filtering entries by status."""
        another_book = Book.objects.create(isbn="333", title="B3", author="A3")
        CatalogEntry.objects.create(book=another_book, status=CatalogEntry.Status.SELL)

        url = reverse("catalog-entries-list")
        response = self.client.get(url, {"status": "SELL"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["status"], CatalogEntry.Status.SELL)

    def test_search_entries(self) -> None:
        """Test searching entries by title or author."""
        url = reverse("catalog-entries-list")
        response = self.client.get(url, {"search": "Test Book"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["book"]["title"], "Test Book")

    @patch("triage.views.get_bulk_ai_recommendation")
    def test_recommend_bulk(self, mock_get_bulk: MagicMock) -> None:
        """Test the bulk recommendation endpoint."""
        from triage.ai_engine import (
            BulkRecommendationResponse,
            BulkTriageRecommendation,
            TriageStatus,
        )
        from triage.models import CullingGoal

        goal = CullingGoal.objects.create(
            name="Test Goal", description="Reduce by 50%", is_active=True
        )

        # Create another entry
        another_book = Book.objects.create(isbn="999", title="Another Book", author="Author")
        another_entry = CatalogEntry.objects.create(book=another_book)

        mock_get_bulk.return_value = BulkRecommendationResponse(
            recommendations=[
                BulkTriageRecommendation(
                    catalog_entry_id=self.entry.id,
                    status=TriageStatus.KEEP,
                    confidence=0.9,
                    reasoning="Classic book.",
                    notable_tags=["Classic"],
                ),
                BulkTriageRecommendation(
                    catalog_entry_id=another_entry.id,
                    status=TriageStatus.SELL,
                    confidence=0.8,
                    reasoning="High resale value.",
                    suggested_price=20.0,
                    notable_tags=["High Value"],
                ),
            ]
        )

        url = reverse("recommend-bulk")
        data = {"entry_ids": [self.entry.id, another_entry.id], "culling_goal_id": goal.id}
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        # Use integer keys as seen in debug output
        self.assertEqual(str(response.data[self.entry.id]["status"]), "KEEP")
        self.assertEqual(str(response.data[another_entry.id]["status"]), "SELL")
        self.assertEqual(response.data[another_entry.id]["suggested_price"], 20.0)
