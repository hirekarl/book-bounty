"""Tests for the triage models.

This module contains unit tests to verify the behavior of the Book and
CatalogEntry models.
"""

from django.test import TestCase

from triage.models import Book, CatalogEntry


class ModelTests(TestCase):
    """Test suite for the Book and CatalogEntry models."""

    def setUp(self) -> None:
        """Set up test data for the model tests."""
        self.book = Book.objects.create(
            isbn="1234567890123",
            title="Test Book",
            author="John Doe",
            publish_year=2024,
            subjects=["Fiction", "Testing"],
        )

    def test_book_creation(self) -> None:
        """Test that a Book instance is correctly created."""
        assert self.book.isbn == "1234567890123"
        assert self.book.title == "Test Book"
        assert self.book.author == "John Doe"
        assert self.book.publish_year == 2024
        assert self.book.subjects == ["Fiction", "Testing"]
        assert str(self.book) == "Test Book by John Doe (2024)"

    def test_catalog_entry_creation(self) -> None:
        """Test that a CatalogEntry instance is correctly created."""
        entry = CatalogEntry.objects.create(
            book=self.book,
            status=CatalogEntry.Status.KEEP,
            condition_flags=["MINT"],
            notes="Excellent condition.",
        )
        assert entry.book == self.book
        assert entry.status == CatalogEntry.Status.KEEP
        assert entry.condition_flags == ["MINT"]
        assert entry.notes == "Excellent condition."
        assert str(entry) == "Test Book - KEEP"

    def test_catalog_entry_sell_status(self) -> None:
        """Test CatalogEntry with SELL status and asking price."""
        entry = CatalogEntry.objects.create(
            book=self.book,
            status=CatalogEntry.Status.SELL,
            asking_price=19.99,
        )
        assert entry.status == CatalogEntry.Status.SELL
        assert entry.asking_price is not None
        assert float(entry.asking_price) == 19.99

    def test_catalog_entry_donate_status(self) -> None:
        """Test CatalogEntry with DONATE status and destination."""
        entry = CatalogEntry.objects.create(
            book=self.book,
            status=CatalogEntry.Status.DONATE,
            donation_dest="Local Library",
        )
        assert entry.status == CatalogEntry.Status.DONATE
        assert entry.donation_dest == "Local Library"
