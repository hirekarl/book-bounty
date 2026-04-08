"""Tests for the triage models.

This module contains unit tests to verify the behavior of the Book and
CatalogEntry models.
"""

from django.contrib.auth.models import User
from django.db.utils import IntegrityError
from django.test import TestCase

from triage.models import Book, CatalogEntry, CullingGoal


class ModelTests(TestCase):
    """Test suite for the Book and CatalogEntry models."""

    def setUp(self) -> None:
        """Set up test data for the model tests."""
        self.user = User.objects.create_user(username="testuser", password="password")
        self.book = Book.objects.create(
            isbn="1234567890123",
            title="Test Book",
            author="John Doe",
            publish_year=2024,
            page_count=350,
            subjects=["Fiction", "Testing"],
        )

    def test_book_creation(self) -> None:
        """Test that a Book instance is correctly created."""
        assert self.book.isbn == "1234567890123"
        assert self.book.title == "Test Book"
        assert self.book.author == "John Doe"
        assert self.book.publish_year == 2024
        assert self.book.page_count == 350
        assert self.book.subjects == ["Fiction", "Testing"]
        assert str(self.book) == "Test Book by John Doe (2024)"

    def test_catalog_entry_creation(self) -> None:
        """Test that a CatalogEntry instance is correctly created."""
        entry = CatalogEntry.objects.create(
            book=self.book,
            user=self.user,
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
            user=self.user,
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
            user=self.user,
            status=CatalogEntry.Status.DONATE,
            donation_dest="Local Library",
        )
        assert entry.status == CatalogEntry.Status.DONATE
        assert entry.donation_dest == "Local Library"

    def test_culling_goal_creation(self) -> None:
        """Test that a CullingGoal instance is correctly created."""
        goal = CullingGoal.objects.create(
            user=self.user,
            name="Test Goal",
            description="Test Description",
        )
        assert goal.user == self.user
        assert goal.name == "Test Goal"
        assert goal.description == "Test Description"
        assert str(goal) == "Test Goal"

    def test_catalog_entry_requires_user(self) -> None:
        """Verify that CatalogEntry.objects.create() raises IntegrityError if user is missing."""
        with self.assertRaises(IntegrityError):
            CatalogEntry.objects.create(
                book=self.book,
                status=CatalogEntry.Status.KEEP,
            )

    def test_culling_goal_requires_user(self) -> None:
        """Verify that CullingGoal.objects.create() raises IntegrityError if user is missing."""
        with self.assertRaises(IntegrityError):
            CullingGoal.objects.create(
                name="Test Goal",
                description="Test Description",
            )
