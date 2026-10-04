from django.db import migrations


MEMBERSHIP_TYPES = [
    ("Honorary Fellow", "honorary-fellow"),
    ("Fellow", "fellow"),
    ("Member", "member"),
    ("Associate", "associate"),
    ("Corporate Member", "corporate-member"),
]


def seed_membership_types(apps, schema_editor):
    MembershipType = apps.get_model("membership", "MembershipType")
    for name, slug in MEMBERSHIP_TYPES:
        MembershipType.objects.get_or_create(slug=slug, defaults={"name": name})


def remove_seeded_membership_types(apps, schema_editor):
    MembershipType = apps.get_model("membership", "MembershipType")
    MembershipType.objects.filter(slug__in=[slug for _, slug in MEMBERSHIP_TYPES], applications__isnull=True, members__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [("membership", "0001_initial")]

    operations = [migrations.RunPython(seed_membership_types, remove_seeded_membership_types)]
