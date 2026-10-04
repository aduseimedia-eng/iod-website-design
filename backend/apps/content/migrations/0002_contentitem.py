import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ContentItem",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "section",
                    models.CharField(
                        choices=[
                            ("hero", "Hero"),
                            ("membership", "Membership"),
                            ("training", "Training"),
                            ("knowledge", "Knowledge"),
                            ("news", "News"),
                            ("partners", "Partners"),
                        ],
                        max_length=20,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("summary", models.TextField(blank=True)),
                ("href", models.CharField(blank=True, max_length=1000)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("image_url", models.CharField(blank=True, max_length=1000)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                (
                    "status",
                    models.CharField(
                        choices=[("draft", "Draft"), ("published", "Published")],
                        default="draft",
                        max_length=12,
                    ),
                ),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="updated_content_items",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["section", "sort_order", "title"]},
        ),
    ]
