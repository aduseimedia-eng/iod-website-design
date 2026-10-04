import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [migrations.CreateModel(name="ContentPage", fields=[
        ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
        ("slug", models.SlugField(unique=True)), ("label", models.CharField(max_length=150)), ("eyebrow", models.CharField(blank=True, max_length=150)), ("title", models.CharField(max_length=255)), ("summary", models.TextField(blank=True)), ("body", models.TextField(blank=True)), ("blocks", models.JSONField(blank=True, default=list)), ("status", models.CharField(choices=[("draft", "Draft"), ("published", "Published")], default="draft", max_length=12)), ("published_at", models.DateTimeField(blank=True, null=True)), ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)), ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="updated_content_pages", to=settings.AUTH_USER_MODEL)),
    ], options={"ordering": ["label"]})]
