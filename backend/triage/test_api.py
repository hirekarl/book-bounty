"""Tests for the triage API endpoints.

This module contains integration tests to verify the behavior of the API
endpoints for looking up books, managing catalog entries, and retrieving
dashboard statistics.
"""

from unittest.mock import MagicMock, patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from triage.models import Book, CatalogEntry


class APITests(APITestCase):
    """Test suite for the triage API endpoints."""

    def setUp(self) -> None:
        """Set up test data for the API tests."""
        self.book = Book.objects.create(
            isbn="1234567890",
            title="Test Book",
            author="Test Author",
            publish_year=2024,
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
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Test Book"
        mock_fetch.assert_not_called()

        # Test lookup for new book
        mock_fetch.return_value = {
            "title": "New Book",
            "author": "New Author",
            "publish_year": 2023,
            "subjects": [],
        }
        url = reverse("book-lookup", kwargs={"isbn": "0987654321"})
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "New Book"
        assert Book.objects.filter(isbn="0987654321").exists()

    def test_list_entries(self) -> None:
        """Test listing catalog entries."""
        url = reverse("catalog-entries-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["book"]["title"] == "Test Book"

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
        assert response.status_code == status.HTTP_201_CREATED
        assert CatalogEntry.objects.filter(
            book=new_book, status=CatalogEntry.Status.SELL,
        ).exists()

    def test_dashboard_stats(self) -> None:
        """Test the dashboard statistics endpoint."""
        # Add another entry to change stats
        another_book = Book.objects.create(isbn="222", title="B2", author="A2")
        CatalogEntry.objects.create(book=another_book, status=CatalogEntry.Status.SELL)

        url = reverse("dashboard-stats")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data[CatalogEntry.Status.KEEP] == 1
        assert response.data[CatalogEntry.Status.SELL] == 1
        assert response.data[CatalogEntry.Status.DONATE] == 0
        assert response.data[CatalogEntry.Status.DISCARD] == 0

    def test_filter_entries(self) -> None:
        """Test filtering entries by status."""
        another_book = Book.objects.create(isbn="333", title="B3", author="A3")
        CatalogEntry.objects.create(book=another_book, status=CatalogEntry.Status.SELL)

        url = reverse("catalog-entries-list")
        response = self.client.get(url, {"status": "SELL"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["status"] == CatalogEntry.Status.SELL

    def test_search_entries(self) -> None:
        """Test searching entries by title or author."""
        url = reverse("catalog-entries-list")
        response = self.client.get(url, {"search": "Test Book"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["book"]["title"] == "Test Book"
