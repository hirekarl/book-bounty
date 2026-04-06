"""Serializers for the triage application.

This module defines serializers for the Book and CatalogEntry models to be
used in the REST API.
"""

from typing import ClassVar

from rest_framework import serializers

from triage.models import Book, CatalogEntry, CullingGoal


class BookSerializer(serializers.ModelSerializer[Book]):
    # ... metadata ...
    class Meta:
        # ... metadata ...
        model = Book
        fields: ClassVar[list[str]] = [
            "id",
            "isbn",
            "title",
            "author",
            "publish_year",
            "page_count",
            "subjects",
            "cover_url",
            "cover_image",
            "description",
            "created_at",
        ]
        read_only_fields: ClassVar[list[str]] = ["id", "created_at"]


class CullingGoalSerializer(serializers.ModelSerializer):
    """Serializer for the CullingGoal model."""

    class Meta:
        """Metadata for the CullingGoalSerializer."""

        model = CullingGoal
        fields = ["id", "name", "description", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


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
            "culling_goal",
            "status",
            "condition_grade",
            "condition_flags",
            "notes",
            "asking_price",
            "donation_dest",
            "valuation_data",
            "ai_recommendation",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields: ClassVar[list[str]] = [
            "id",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
