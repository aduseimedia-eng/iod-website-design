from rest_framework import serializers

from .models import ContentItem, ContentPage


class ContentPageSerializer(serializers.ModelSerializer):
    updated_by_email = serializers.EmailField(source="updated_by.email", read_only=True)

    class Meta:
        model = ContentPage
        fields = ("id", "slug", "label", "eyebrow", "title", "summary", "body", "blocks", "status", "published_at", "updated_by_email", "created_at", "updated_at")
        read_only_fields = ("id", "published_at", "updated_by_email", "created_at", "updated_at")


class ContentItemSerializer(serializers.ModelSerializer):
    updated_by_email = serializers.EmailField(source="updated_by.email", read_only=True)

    class Meta:
        model = ContentItem
        fields = (
            "id",
            "section",
            "title",
            "summary",
            "href",
            "metadata",
            "image_url",
            "sort_order",
            "status",
            "published_at",
            "updated_by_email",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "published_at", "updated_by_email", "created_at", "updated_at")

    def validate_metadata(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Metadata must be a JSON object.")
        return value


class PublicContentItemQuerySerializer(serializers.Serializer):
    section = serializers.ChoiceField(choices=ContentItem.Section.choices)


class StaffContentItemListQuerySerializer(serializers.Serializer):
    section = serializers.ChoiceField(choices=ContentItem.Section.choices, required=False)
    status = serializers.ChoiceField(choices=ContentItem.Status.choices, required=False)
