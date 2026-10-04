from django.db import migrations


def purge_stored_cvs(apps, schema_editor):
    application_model = apps.get_model("membership", "MembershipApplication")
    field = application_model._meta.get_field("cv")
    storage = field.storage
    for name in application_model.objects.exclude(cv="").values_list("cv", flat=True):
        storage.delete(name)


class Migration(migrations.Migration):
    dependencies = [("membership", "0006_memberdirectoryentry")]

    operations = [
        migrations.RunPython(purge_stored_cvs, migrations.RunPython.noop),
        migrations.RemoveField(model_name="membershipapplication", name="cv"),
    ]
