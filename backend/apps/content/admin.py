from django.contrib import admin

from .models import ContentItem, ContentPage


@admin.register(ContentPage)
class ContentPageAdmin(admin.ModelAdmin):
    list_display = ("label", "slug", "status", "updated_at", "updated_by")
    list_filter = ("status",)
    search_fields = ("label", "title", "slug")
    readonly_fields = ("published_at", "created_at", "updated_at")


@admin.register(ContentItem)
class ContentItemAdmin(admin.ModelAdmin):
    list_display = ("title", "section", "sort_order", "status", "updated_at", "updated_by")
    list_filter = ("section", "status")
    search_fields = ("title", "summary", "href")
    ordering = ("section", "sort_order", "title")
    readonly_fields = ("published_at", "created_at", "updated_at")
