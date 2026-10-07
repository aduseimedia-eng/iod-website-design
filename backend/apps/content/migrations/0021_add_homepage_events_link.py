from django.db import migrations


def add_homepage_events_link(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    PageSection = apps.get_model("content", "CMSPageSection")
    PageRevision = apps.get_model("content", "CMSPageRevision")

    for page in Page.objects.filter(slug="home"):
        for revision in PageRevision.objects.filter(page=page):
            changed = False
            for section in PageSection.objects.filter(revision=revision):
                if section.data.get("home_section") != "training":
                    continue
                data = {**section.data, "button_label": "Explore all events", "button_href": "/events"}
                if data != section.data:
                    section.data = data
                    section.save(update_fields=["data"])
                    changed = True
            if changed:
                snapshot = dict(revision.snapshot)
                snapshot["sections"] = [
                    {**section, "data": {**section["data"], "button_label": "Explore all events", "button_href": "/events"}}
                    if section.get("data", {}).get("home_section") == "training" else section
                    for section in snapshot.get("sections", [])
                ]
                revision.snapshot = snapshot
                revision.save(update_fields=["snapshot"])


class Migration(migrations.Migration):
    dependencies = [("content", "0020_rename_homepage_training_to_events")]

    operations = [migrations.RunPython(add_homepage_events_link, migrations.RunPython.noop)]
