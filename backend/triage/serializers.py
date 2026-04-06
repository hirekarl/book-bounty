"""Serializers for the triage application.

This module defines serializers for the Book and CatalogEntry models to be
used in the REST API.
"""

from typing import ClassVar

from rest_framework import serializers

from triage.models import Book, CatalogEntry


class BookSerializer(serializers.ModelSerializer[Book]):
    """Serializer for the Book model."""

    class Meta:
        """Metadata for the BookSerializer."""

        model = Book
        fields: ClassVar[list[str]] = [
            "id",
            "isbn",
            "title",
            "author",
            "publish_year",
            "subjects",
            "created_at",
        ]
        read_only_fields: ClassVar[list[str]] = ["id", "created_at"]


class CatalogEntrySerializer(serializers.ModelSerializer[CatalogEntry]):
    """Serializer for the CatalogEntry model.

    Includes the nested Book metadata.
    """

    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(
        queryset=Book.objects.all(), source="book", write_only=True,
    )

    class Meta:
        """Metadata for the CatalogEntrySerializer."""

        model = CatalogEntry
        fields: ClassVar[list[str]] = [
            "id",
            "book",
            "book_id",
            "status",
            "condition_flags",
            "notes",
            "asking_price",
            "donation_dest",
            "created_at",
            "updated_at",
        ]
        read_only_fields: ClassVar[list[str]] = ["id", "created_at", "updated_at"]
