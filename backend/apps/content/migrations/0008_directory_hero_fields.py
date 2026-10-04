from django.db import migrations


def consolidate_hero(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    page = Page.objects.filter(slug="membership-members-in-good-standing").first()
    if not page:
        return
    aliases = {
        "sukx4u": ("eyebrow", "Membership register"),
        "1ajfdwz": ("summary", "A public register for recognising IoD-Gh members whose membership standing is current."),
    }
    for revision in page.revisions.filter(id__in=[page.published_revision_id, page.current_draft_revision_id]):
        section = revision.sections.filter(slot="page_copy").first()
        if not section:
            continue
        fields = section.data.get("fields", [])
        moved = [field for field in fields if field.get("key") in aliases]
        for field in moved:
            name, default = aliases[field["key"]]
            # Preserve an existing edit from the old duplicate field unless the
            # dedicated Hero field already has its own non-default value.
            if getattr(revision, name) == default and field.get("value") != default:
                setattr(revision, name, field.get("value", ""))
        section.data = {**section.data, "fields": [field for field in fields if field.get("key") not in aliases]}
        section.save(update_fields=["data"])
        snapshot = dict(revision.snapshot)
        snapshot.update(eyebrow=revision.eyebrow, summary=revision.summary)
        snapshot["retired_hero_copy_fields"] = moved  # Keep old values recoverable.
        for entry in snapshot.get("sections", []):
            if entry.get("slot") == "page_copy":
                entry["data"] = section.data
        revision.snapshot = snapshot
        revision.save(update_fields=["eyebrow", "summary", "snapshot"])


class Migration(migrations.Migration):
    dependencies = [("content", "0007_news_editor")]
    operations = [migrations.RunPython(consolidate_hero, migrations.RunPython.noop)]
