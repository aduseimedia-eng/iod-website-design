from django.core.files.storage import default_storage
from django.db import migrations


CV_STORAGE_PREFIX = "membership_applications/cv"


def purge_directory(path):
    try:
        directories, filenames = default_storage.listdir(path)
    except FileNotFoundError:
        return
    for filename in filenames:
        default_storage.delete(f"{path}/{filename}")
    for directory in directories:
        purge_directory(f"{path}/{directory}")


def purge_orphaned_cvs(apps, schema_editor):
    purge_directory(CV_STORAGE_PREFIX)


class Migration(migrations.Migration):
    dependencies = [("membership", "0007_remove_stored_membership_cvs")]

    operations = [migrations.RunPython(purge_orphaned_cvs, migrations.RunPython.noop)]
