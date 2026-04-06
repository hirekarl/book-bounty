"""Models for the triage application.

This module defines the core data structures for BookBounty, including the Book
metadata and the CatalogEntry record for physical copies.
"""


from django.db import models


class Book(models.Model):
    """Stores immutable metadata for a book, keyed by ISBN."""
    # ... attributes ...
    isbn = models.CharField(max_length=13, unique=True, null=True, blank=True, db_index=True)
    title = models.CharField(max_length=255, db_index=True)
    author = models.CharField(max_length=255, db_index=True)
    publish_year = models.IntegerField(null=True, blank=True)
    subjects = models.JSONField(default=list, blank=True)
    cover_url = models.URLField(max_length=500, null=True, blank=True)
    cover_image = models.ImageField(upload_to="covers/", null=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        """Returns a string representation of the book."""
        return f"{self.title} by {self.author} ({self.publish_year})"


class CullingGoal(models.Model):
    """Defines the user's high-level goal for a culling session.

    Attributes:
        name (str): Short name for the goal (e.g., 'Minimalist Move').
        description (str): Detailed prompt context for the AI.
        is_active (bool): Whether this is the current active goal.
    """

    name = models.CharField(max_length=100)
    description = models.TextField()
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        """Returns a string representation of the goal."""
        return str(self.name)


class CatalogEntry(models.Model):
    """Records the user's decision and specific details for a physical copy."""

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
    culling_goal = models.ForeignKey(
        CullingGoal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entries",
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.KEEP, db_index=True
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
    ai_recommendation = models.JSONField(default=dict, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        """Returns a string representation of the catalog entry."""
        return f"{self.book.title} - {self.status}"
