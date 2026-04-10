from django.contrib import admin

from .models import Book, CatalogEntry, CullingGoal


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "isbn", "publish_year", "page_count")
    search_fields = ("title", "author", "isbn")
    list_filter = ("publish_year",)
    readonly_fields = ("created_at",)


@admin.register(CullingGoal)
class CullingGoalAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "is_active", "created_at")
    list_filter = ("is_active", "user")
    search_fields = ("name", "description")
    readonly_fields = ("created_at",)


@admin.register(CatalogEntry)
class CatalogEntryAdmin(admin.ModelAdmin):
    list_display = ("book", "user", "status", "condition_grade", "asking_price", "resolved_at", "created_at")
    list_filter = ("status", "condition_grade", "user")
    search_fields = ("book__title", "book__author", "notes")
    readonly_fields = ("created_at", "updated_at")
    raw_id_fields = ("book", "culling_goal")
