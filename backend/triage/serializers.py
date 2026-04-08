"""Serializers for the triage application.

This module defines serializers for the Book and CatalogEntry models to be
used in the REST API.
"""

from typing import ClassVar

from django.utils import timezone
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

    Includes the nested Book metadata. The culling_goal field is restricted
    to goals owned by the requesting user to prevent cross-tenant FK pollution.
    """

    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(
        queryset=Book.objects.all(), source="book", write_only=True,
    )

    def get_fields(self) -> dict:
        """Restricts culling_goal choices to the requesting user's goals."""
        fields = super().get_fields()
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            fields["culling_goal"].queryset = CullingGoal.objects.filter(user=request.user)
        return fields

    def validate_resolved_at(self, value: object) -> object:
        """Rejects future-dated resolution timestamps."""
        if value is not None and value > timezone.now():
            raise serializers.ValidationError(
                "resolved_at cannot be set to a future date.",
            )
        return value

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
            "marketplace_description",
            "donation_dest",
            "valuation_data",
            "ai_recommendation",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields: ClassVar[list[str]] = [
            "id",
            "created_at",
            "updated_at",
        ]
