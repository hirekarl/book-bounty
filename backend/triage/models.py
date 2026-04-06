"""Models for the triage application.

This module defines the core data structures for BookBounty, including the Book
metadata and the CatalogEntry record for physical copies.
"""


from django.db import models


class Book(models.Model):
    """Stores immutable metadata for a book, keyed by ISBN.

    Attributes:
        isbn (str): Unique ISBN for the book. Optional for manual entries.
        title (str): Title of the book.
        author (str): Author(s) of the book.
        publish_year (int): Year the book was published.
        subjects (list[str]): List of subjects associated with the book.
        created_at (datetime): Timestamp when the book record was created.
    """

    isbn = models.CharField(max_length=13, unique=True, null=True, blank=True)
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    publish_year = models.IntegerField(null=True, blank=True)
    subjects = models.JSONField(default=list, blank=True)
    cover_url = models.URLField(max_length=500, null=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        """Returns a string representation of the book."""
        return f"{self.title} by {self.author} ({self.publish_year})"


class CatalogEntry(models.Model):
    """Records the user's decision and specific details for a physical copy.

    Attributes:
        book (Book): ForeignKey to the Book metadata.
        status (str): Current triage status (KEEP, DONATE, SELL, DISCARD).
        condition_flags (list[str]): JSON list of condition descriptions.
        notes (str): Additional user-provided notes.
        asking_price (Decimal): Price for books marked for sale.
        donation_dest (str): Destination for donated books.
        created_at (datetime): Timestamp when the entry was created.
        updated_at (datetime): Timestamp when the entry was last updated.
    """

    class Status(models.TextChoices):
        """Triage status choices."""

        KEEP = "KEEP", "Keep"
        DONATE = "DONATE", "Donate"
        SELL = "SELL", "Sell"
        DISCARD = "DISCARD", "Discard"

    class Condition(models.TextChoices):
        """Condition grades."""

        MINT = "MINT", "Mint"
        GOOD = "GOOD", "Good"
        FAIR = "FAIR", "Fair"
        POOR = "POOR", "Poor"

    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="entries")
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.KEEP,
    )
    condition_grade = models.CharField(
        max_length=10, choices=Condition.choices, default=Condition.GOOD,
    )
    condition_flags = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)
    asking_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )
    donation_dest = models.CharField(max_length=255, blank=True)
    valuation_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        """Returns a string representation of the catalog entry."""
        return f"{self.book.title} - {self.status}"
