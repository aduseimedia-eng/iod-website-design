from django.db import migrations


OLD = "IOD-GH"
NEW = "IoD-Gh"


def replace_text(value, old=OLD, new=NEW):
    if isinstance(value, str):
        return value.replace(old, new)
    if isinstance(value, list):
        return [replace_text(item, old, new) for item in value]
    if isinstance(value, dict):
        return {key: replace_text(item, old, new) for key, item in value.items()}
    return value


def update_content(apps, old=OLD, new=NEW):
    PageRevision = apps.get_model("content", "CMSPageRevision")
    PageSection = apps.get_model("content", "CMSPageSection")
    ArticleRevision = apps.get_model("content", "CMSArticleRevision")
    SiteSettingsRevision = apps.get_model("content", "CMSSiteSettingsRevision")

    for section in PageSection.objects.all():
        data = replace_text(section.data, old, new)
        if data != section.data:
            section.data = data
            section.save(update_fields=["data"])
    for revision in PageRevision.objects.all():
        fields = {field: replace_text(getattr(revision, field), old, new) for field in ("eyebrow", "title", "summary", "body", "seo_title", "seo_description", "canonical_path", "change_summary", "review_note")}
        if any(getattr(revision, field) != value for field, value in fields.items()):
            for field, value in fields.items():
                setattr(revision, field, value)
            revision.save(update_fields=list(fields))
    for revision in ArticleRevision.objects.all():
        fields = {field: replace_text(getattr(revision, field), old, new) for field in ("title", "standfirst", "body", "seo_title", "seo_description", "change_summary")}
        if any(getattr(revision, field) != value for field, value in fields.items()):
            for field, value in fields.items():
                setattr(revision, field, value)
            revision.save(update_fields=list(fields))
    for revision in SiteSettingsRevision.objects.all():
        data = replace_text(revision.data, old, new)
        if data != revision.data:
            revision.data = data
            revision.save(update_fields=["data"])


def forwards(apps, schema_editor):
    update_content(apps)


def backwards(apps, schema_editor):
    update_content(apps, NEW, OLD)


class Migration(migrations.Migration):
    dependencies = [("content", "0018_add_training_countdown_section")]

    operations = [migrations.RunPython(forwards, backwards)]
