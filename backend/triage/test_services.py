"""Tests for the triage services.

This module contains unit tests to verify the behavior of the ISBN lookup
and triage suggestion services.
"""

from unittest.mock import MagicMock, patch

from django.test import TestCase

from triage.models import Book, CatalogEntry
from triage.services import (
    fetch_book_metadata,
    get_or_create_book,
    suggest_triage_outcome,
)


class ServiceTests(TestCase):
    """Test suite for the triage services."""

    @patch("requests.get")
    def test_fetch_book_metadata_success(self, mock_get: MagicMock) -> None:
        """Test successful metadata fetch from Open Library."""
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "ISBN:1234567890": {
                "title": "Test Book Title",
                "authors": [{"name": "Test Author"}],
                "publish_date": "2024",
                "subjects": [{"name": "Fiction"}],
            },
        }

        metadata = fetch_book_metadata("1234567890")
        assert metadata["title"] == "Test Book Title"
        assert metadata["author"] == "Test Author"
        assert metadata["publish_year"] == 2024
        assert metadata["subjects"] == ["Fiction"]

    @patch("requests.get")
    def test_fetch_book_metadata_not_found(self, mock_get: MagicMock) -> None:
        """Test metadata fetch when book is not found in Open Library."""
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {}

        metadata = fetch_book_metadata("1234567890")
        assert metadata == {}

    @patch("triage.services.fetch_book_metadata")
    def test_get_or_create_book_local(self, mock_fetch: MagicMock) -> None:
        """Test getting a book that already exists locally."""
        Book.objects.create(isbn="111", title="Local Book", author="Author")
        book, created = get_or_create_book("111")
        assert not created
        assert book.title == "Local Book"
        mock_fetch.assert_not_called()

    @patch("triage.services.fetch_book_metadata")
    def test_get_or_create_book_fetch(self, mock_fetch: MagicMock) -> None:
        """Test fetching and creating a book that doesn't exist locally."""
        mock_fetch.return_value = {
            "title": "Remote Book",
            "author": "Remote Author",
            "publish_year": 2023,
            "subjects": ["Science"],
        }
        book, created = get_or_create_book("222")
        assert created
        assert book.title == "Remote Book"
        assert Book.objects.filter(isbn="222").exists()

    def test_suggest_triage_outcome_discard(self) -> None:
        """Test suggestion logic for damaged books."""
        outcome = suggest_triage_outcome(["WATER_DAMAGE"])
        assert outcome == CatalogEntry.Status.DISCARD

    def test_suggest_triage_outcome_keep(self) -> None:
        """Test suggestion logic for books in good condition."""
        outcome = suggest_triage_outcome([])
        assert outcome == CatalogEntry.Status.KEEP
