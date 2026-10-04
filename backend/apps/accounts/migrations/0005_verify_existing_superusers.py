from django.db import migrations
from django.utils import timezone


def verify_existing_superusers(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(is_superuser=True, email_verified_at__isnull=True).update(email_verified_at=timezone.now())


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_user_phone_number"),
    ]

    operations = [
        migrations.RunPython(verify_existing_superusers, migrations.RunPython.noop),
    ]
