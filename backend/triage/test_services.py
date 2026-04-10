"""Tests for the triage services.

This module contains unit tests to verify the behavior of the ISBN lookup
and triage suggestion services.
"""

from unittest.mock import MagicMock, patch

from django.test import TestCase

from triage.models import Book, CatalogEntry
from triage.services import (
    _isbn10_to_isbn13,
    download_cover_image,
    fetch_book_metadata,
    fetch_valuation_data,
    get_or_create_book,
    suggest_triage_outcome,
)


class ServiceTests(TestCase):
    """Test suite for the triage services."""

    @patch("requests.get")
    def test_download_cover_image_success(self, mock_get: MagicMock) -> None:
        """Test successful cover image download with extension in URL."""
        book = Book.objects.create(isbn="9781603582865", title="Test Book", author="Author")
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.content = b"fake_image_data"
        mock_response.headers = {"Content-Type": "image/jpeg"}

        download_cover_image(book, "http://example.com/cover.jpg")
        
        book.refresh_from_db()
        self.assertTrue(book.cover_image)
        self.assertIn("cover", book.cover_image.name)
        self.assertTrue(book.cover_image.name.endswith(".jpg"))

    @patch("requests.get")
    def test_download_cover_image_no_extension_in_url(self, mock_get: MagicMock) -> None:
        """Test cover image download when URL has no extension, using Content-Type."""
        book = Book.objects.create(isbn="9781603582865", title="Test Book", author="Author")
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.content = b"fake_image_data"
        mock_response.headers = {"Content-Type": "image/png"}

        # URL without extension
        download_cover_image(book, "http://example.com/covers/12345")
        
        book.refresh_from_db()
        self.assertTrue(book.cover_image)
        # Should append .png based on Content-Type
        self.assertIn("12345", book.cover_image.name)
        self.assertTrue(book.cover_image.name.endswith(".png"))

    @patch("requests.get")
    def test_download_cover_image_empty_path(self, mock_get: MagicMock) -> None:
        """Test cover image download when URL path is empty."""
        book = Book.objects.create(isbn="9781603582865", title="Test Book", author="Author")
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.content = b"fake_image_data"
        mock_response.headers = {"Content-Type": "image/jpeg"}

        # URL with empty path
        download_cover_image(book, "http://example.com")
        
        book.refresh_from_db()
        self.assertTrue(book.cover_image)
        # Should fallback to cover_{isbn}.jpg
        self.assertIn(f"cover_{book.isbn}", book.cover_image.name)
        self.assertTrue(book.cover_image.name.endswith(".jpg"))

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
                "number_of_pages": 450,
            },
        }

        metadata = fetch_book_metadata("1234567890")
        self.assertEqual(metadata["title"], "Test Book Title")
        self.assertEqual(metadata["author"], "Test Author")
        self.assertEqual(metadata["publish_year"], 2024)
        self.assertEqual(metadata["subjects"], ["Fiction"])
        self.assertEqual(metadata["page_count"], 450)

    @patch("requests.get")
    def test_fetch_book_metadata_not_found(self, mock_get: MagicMock) -> None:
        """Test metadata fetch when book is not found in Open Library."""
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {}

        metadata = fetch_book_metadata("1234567890")
        self.assertEqual(metadata, {})

    @patch("triage.services.fetch_book_metadata")
    def test_get_or_create_book_local(self, mock_fetch: MagicMock) -> None:
        """Test getting a book that already exists locally."""
        Book.objects.create(isbn="111", title="Local Book", author="Author")
        book, created = get_or_create_book("111")
        self.assertFalse(created)
        self.assertEqual(book.title, "Local Book")
        mock_fetch.assert_not_called()

    @patch("triage.services.fetch_book_metadata")
    def test_get_or_create_book_fetch(self, mock_fetch: MagicMock) -> None:
        """Test fetching and creating a book that doesn't exist locally."""
        mock_fetch.return_value = {
            "title": "Remote Book",
            "author": "Remote Author",
            "publish_year": 2023,
            "subjects": ["Science"],
            "cover_url": "http://example.com/cover.jpg",
            "description": "A book description.",
            "page_count": 300,
        }
        book, created = get_or_create_book("222")
        self.assertTrue(created)
        self.assertEqual(book.title, "Remote Book")
        self.assertEqual(book.page_count, 300)
        self.assertTrue(Book.objects.filter(isbn="222").exists())

    def test_suggest_triage_outcome_discard(self) -> None:
        """Test suggestion logic for damaged books."""
        outcome = suggest_triage_outcome(["WATER_DAMAGE"])
        self.assertEqual(outcome, CatalogEntry.Status.DISCARD)

    def test_suggest_triage_outcome_keep(self) -> None:
        """Test suggestion logic for books in good condition."""
        outcome = suggest_triage_outcome([])
        self.assertEqual(outcome, CatalogEntry.Status.KEEP)

    @patch("triage.services.requests.get")
    @patch("triage.services._get_ebay_token")
    def test_fetch_valuation_data_success(self, mock_token: MagicMock, mock_get: MagicMock) -> None:
        """Test successful valuation data fetch from eBay."""
        mock_token.return_value = "fake_token"
        mock_response = mock_get.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "itemSummaries": [
                {"price": {"value": "10.00"}},
                {"price": {"value": "20.00"}},
            ]
        }

        data = fetch_valuation_data("039309040X")
        self.assertIn("ebay", data)
        self.assertEqual(data["ebay"]["low"], 10.00)
        self.assertEqual(data["ebay"]["high"], 20.00)
        self.assertEqual(data["ebay"]["sample_size"], 2)

        # Verify URL construction and ISBN-10 → ISBN-13 conversion
        args, kwargs = mock_get.call_args
        self.assertEqual(args[0], "https://api.ebay.com/buy/browse/v1/item_summary/search")
        self.assertEqual(kwargs["params"]["gtin"], "9780393090406")

    def test_isbn10_to_isbn13_x_check_digit(self) -> None:
        """ISBN-10 with X check digit converts correctly."""
        self.assertEqual(_isbn10_to_isbn13("039309040X"), "9780393090406")

    def test_isbn10_to_isbn13_numeric_check_digit(self) -> None:
        """ISBN-10 with numeric check digit converts correctly."""
        # The Great Gatsby: 0743273567 → 9780743273565
        self.assertEqual(_isbn10_to_isbn13("0743273567"), "9780743273565")

    def test_isbn10_to_isbn13_already_isbn13(self) -> None:
        """ISBN-13 is returned unchanged."""
        self.assertEqual(_isbn10_to_isbn13("9780393090406"), "9780393090406")
