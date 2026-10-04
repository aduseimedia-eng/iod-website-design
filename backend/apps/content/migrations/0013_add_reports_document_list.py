from django.db import migrations


def add_reports_document_list(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    Section = apps.get_model("content", "CMSPageSection")
    try:
        page = Page.objects.get(slug="knowledge-reports")
    except Page.DoesNotExist:
        return
    revision = page.published_revision or page.current_draft_revision
    if not revision or Section.objects.filter(revision=revision, section_type="document_list").exists():
        return
    Section.objects.create(
        revision=revision,
        slot="main",
        position=1,
        section_type="document_list",
        data={"items": []},
        is_enabled=True,
    )


class Migration(migrations.Migration):
    dependencies = [("content", "0012_add_resources_document_list")]

    operations = [migrations.RunPython(add_reports_document_list, migrations.RunPython.noop)]
