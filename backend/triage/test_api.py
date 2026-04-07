"""Tests for the triage API endpoints.

This module contains integration tests to verify the behavior of the API
endpoints for looking up books, managing catalog entries, and retrieving
dashboard statistics.
"""

from unittest.mock import MagicMock, patch, ANY

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
            ).exists(),
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
            name="Test Goal", description="Reduce by 50%", is_active=True,
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
                    marketplace_description="Bulk recommended selling.",
                    notable_tags=["High Value"],
                ),
            ],
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
        self.assertEqual(response.data[another_entry.id]["marketplace_description"], "Bulk recommended selling.")

    @patch("triage.views.get_ai_recommendation")
    def test_recommend_view_includes_description(self, mock_get_rec: MagicMock) -> None:
        """Test that RecommendView includes marketplace_description."""
        from triage.ai_engine import TriageRecommendation, TriageStatus
        from triage.models import CullingGoal

        CullingGoal.objects.create(name="Goal", description="D", is_active=True)

        mock_get_rec.return_value = TriageRecommendation(
            status=TriageStatus.SELL,
            confidence=0.85,
            reasoning="Good resale.",
            marketplace_description="This is a great book for your collection.",
            notable_tags=["Resale"],
        )

        url = reverse("recommend")
        data = {"isbn": "1234567890"}
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["marketplace_description"],
            "This is a great book for your collection.",
        )

    def test_create_entry_with_ai_rec_description(self) -> None:
        """Test creating an entry where description is extracted from AI rec."""
        new_book = Book.objects.create(
            isbn="222333",
            title="AI Book",
            author="AI Author",
        )
        url = reverse("catalog-entries-list")
        data = {
            "book_id": new_book.id,
            "status": CatalogEntry.Status.SELL,
            "ai_recommendation": {
                "status": "SELL",
                "marketplace_description": "Extracted from AI",
                "confidence": 0.9,
                "reasoning": "Resellable",
            },
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        entry = CatalogEntry.objects.get(book=new_book)
        self.assertEqual(entry.marketplace_description, "Extracted from AI")

    def test_update_entry_with_ai_rec_description(self) -> None:
        """Test updating an entry where description is extracted from AI rec."""
        url = reverse("catalog-entries-detail", kwargs={"pk": self.entry.id})
        data = {
            "ai_recommendation": {
                "status": "KEEP",
                "marketplace_description": "Keep this gem",
                "confidence": 0.95,
                "reasoning": "Rare",
            },
        }
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.entry.refresh_from_db()
        self.assertEqual(self.entry.marketplace_description, "Keep this gem")


class SerializerEdgeCaseTests(BaseAPITestCase):
    """D1 — Serializer edge case tests covering FK validation and un-resolve."""

    def setUp(self) -> None:
        """Set up a book and entry for edge-case tests."""
        super().setUp()
        self.book = Book.objects.create(
            isbn="5551234567890",
            title="Edge Case Book",
            author="Edge Author",
        )
        self.entry = CatalogEntry.objects.create(
            book=self.book,
            status=CatalogEntry.Status.KEEP,
        )

    def test_create_entry_invalid_book_id(self) -> None:
        """Creating a CatalogEntry with a non-existent book_id must return 400."""
        url = reverse("catalog-entries-list")
        data = {
            "book_id": 999999,
            "status": CatalogEntry.Status.KEEP,
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_entry_missing_book_id(self) -> None:
        """Creating a CatalogEntry with no book_id must return 400."""
        url = reverse("catalog-entries-list")
        data = {
            "status": CatalogEntry.Status.KEEP,
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_resolved_at_null_clears_resolution(self) -> None:
        """PATCHing resolved_at to null on a resolved entry must un-resolve it (Wave A1)."""
        from django.utils import timezone

        # First resolve the entry via the resolve action
        resolve_url = reverse("catalog-entries-resolve", kwargs={"pk": self.entry.pk})
        resolve_response = self.client.post(resolve_url)
        self.assertEqual(resolve_response.status_code, status.HTTP_200_OK)

        # Confirm it is now resolved
        self.entry.refresh_from_db()
        self.assertIsNotNone(self.entry.resolved_at)

        # PATCH resolved_at back to null to un-resolve
        patch_url = reverse("catalog-entries-detail", kwargs={"pk": self.entry.pk})
        patch_response = self.client.patch(patch_url, {"resolved_at": None}, format="json")
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)

        # Confirm the entry is now unresolved
        self.entry.refresh_from_db()
        self.assertIsNone(self.entry.resolved_at)


class HappyPathIntegrationTest(BaseAPITestCase):
    """D2 — Full happy-path workflow integration test."""

    @patch("triage.services.fetch_book_metadata")
    def test_full_workflow(self, mock_fetch: MagicMock) -> None:
        """Exercises the complete scan-to-triage-to-unresolve workflow end-to-end."""
        from triage.models import CullingGoal

        # Step 1: Create a CullingGoal and set it active.
        goal = CullingGoal.objects.create(
            name="Minimalist Move",
            description="Cut collection to essentials for a cross-country move.",
            is_active=True,
        )
        self.assertIsNotNone(goal.pk)
        self.assertTrue(goal.is_active)

        # Step 2: POST to /api/lookup/{isbn}/ — mock the Open Library HTTP call.
        isbn = "9780374528379"
        mock_fetch.return_value = {
            "isbn": isbn,
            "title": "Thinking, Fast and Slow",
            "author": "Daniel Kahneman",
            "publish_year": 2011,
            "subjects": ["Psychology", "Economics"],
            "page_count": 499,
            "cover_url": None,
            "description": "A landmark work in behavioral economics.",
        }
        lookup_url = reverse("book-lookup", kwargs={"isbn": isbn})
        lookup_response = self.client.get(lookup_url)
        self.assertEqual(lookup_response.status_code, status.HTTP_200_OK)
        self.assertEqual(lookup_response.data["title"], "Thinking, Fast and Slow")
        self.assertTrue(Book.objects.filter(isbn=isbn).exists())
        book = Book.objects.get(isbn=isbn)

        # Step 3: POST to /api/entries/ to create a CatalogEntry.
        entries_url = reverse("catalog-entries-list")
        create_data = {
            "book_id": book.id,
            "culling_goal": goal.id,
            "status": CatalogEntry.Status.KEEP,
            "condition_grade": CatalogEntry.Condition.GOOD,
            "notes": "A personal favourite — keep it.",
        }
        create_response = self.client.post(entries_url, create_data, format="json")
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        entry_id = create_response.data["id"]
        self.assertIsNone(create_response.data["resolved_at"])

        # Step 4: POST to /api/entries/{id}/resolve/ to resolve the entry.
        resolve_url = reverse("catalog-entries-resolve", kwargs={"pk": entry_id})
        resolve_response = self.client.post(resolve_url)
        self.assertEqual(resolve_response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resolve_response.data["resolved_at"])

        # Step 5: GET /api/entries/?resolved=true — entry must appear.
        resolved_list_response = self.client.get(entries_url, {"resolved": "true"})
        self.assertEqual(resolved_list_response.status_code, status.HTTP_200_OK)
        resolved_ids = [e["id"] for e in resolved_list_response.data]
        self.assertIn(entry_id, resolved_ids)

        # Step 6: PATCH /api/entries/{id}/ with resolved_at=null to un-resolve.
        detail_url = reverse("catalog-entries-detail", kwargs={"pk": entry_id})
        unresolve_response = self.client.patch(
            detail_url, {"resolved_at": None}, format="json",
        )
        self.assertEqual(unresolve_response.status_code, status.HTTP_200_OK)
        self.assertIsNone(unresolve_response.data["resolved_at"])

        # Step 7: GET /api/entries/?resolved=false — entry must be back in active list.
        active_list_response = self.client.get(entries_url, {"resolved": "false"})
        self.assertEqual(active_list_response.status_code, status.HTTP_200_OK)
        active_ids = [e["id"] for e in active_list_response.data]
        self.assertIn(entry_id, active_ids)
