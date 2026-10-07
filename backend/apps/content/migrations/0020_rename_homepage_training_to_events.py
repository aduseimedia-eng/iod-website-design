from django.db import migrations


def update_homepage_event_label(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    PageSection = apps.get_model("content", "CMSPageSection")
    PageRevision = apps.get_model("content", "CMSPageRevision")

    for page in Page.objects.filter(slug="home"):
        revisions = PageRevision.objects.filter(page=page)
        for revision in revisions:
            changed = False
            for section in PageSection.objects.filter(revision=revision):
                if section.data.get("home_section") != "training":
                    continue
                data = dict(section.data)
                if data.get("eyebrow") != "Upcoming events":
                    data["eyebrow"] = "Upcoming events"
                    section.data = data
                    section.save(update_fields=["data"])
                    changed = True
            if changed:
                snapshot = dict(revision.snapshot)
                sections = []
                for section in snapshot.get("sections", []):
                    if section.get("data", {}).get("home_section") == "training":
                        section = {**section, "data": {**section["data"], "eyebrow": "Upcoming events"}}
                    sections.append(section)
                snapshot["sections"] = sections
                revision.snapshot = snapshot
                revision.save(update_fields=["snapshot"])


class Migration(migrations.Migration):
    dependencies = [("content", "0019_standardize_iod_ghana_casing")]

    operations = [migrations.RunPython(update_homepage_event_label, migrations.RunPython.noop)]
