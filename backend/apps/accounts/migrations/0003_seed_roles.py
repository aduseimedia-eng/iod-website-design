from django.db import migrations


ROLE_NAMES = [
    "Super Admin",
    "Membership Officer",
    "Training Officer",
    "Finance",
    "Content Manager",
    "Read Only",
]


def create_roles(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    for name in ROLE_NAMES:
        Group.objects.get_or_create(name=name)


def remove_roles(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name__in=ROLE_NAMES).delete()


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_staffprofile")]

    operations = [migrations.RunPython(create_roles, remove_roles)]
