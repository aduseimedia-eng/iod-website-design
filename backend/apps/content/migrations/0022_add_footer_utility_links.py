from django.db import migrations


UTILITY_LINKS = [
    {"label": "Apply for membership", "href": "/membership/apply", "enabled": True, "new_tab": False},
    {"label": "Membership verification", "href": "/membership/verify", "enabled": True, "new_tab": False},
    {"label": "Board evaluation", "href": "/services/board-evaluation", "enabled": True, "new_tab": False},
    {"label": "Governance consultancy", "href": "/services/consultancy", "enabled": True, "new_tab": False},
    {"label": "Corporate meetings", "href": "/services/corporate-meeting", "enabled": True, "new_tab": False},
]


def add_footer_utility_links(apps, schema_editor):
    SettingsRevision = apps.get_model("content", "CMSSiteSettingsRevision")

    for revision in SettingsRevision.objects.all():
        data = dict(revision.data)
        footer = data.get("footer")
        if not isinstance(footer, dict):
            footer = {}
        columns = list(footer.get("columns", []))
        column = next((item for item in columns if isinstance(item, dict) and item.get("title") == "Useful links"), None)
        if column is None:
            columns.append({"title": "Useful links", "enabled": True, "links": UTILITY_LINKS})
        else:
            existing = {item.get("href") for item in column.get("links", []) if isinstance(item, dict)}
            column["links"] = [*column.get("links", []), *(item for item in UTILITY_LINKS if item["href"] not in existing)]
        next_data = {**data, "footer": {**footer, "columns": columns}}
        if next_data != revision.data:
            revision.data = next_data
            revision.save(update_fields=["data"])


class Migration(migrations.Migration):
    dependencies = [("content", "0021_add_homepage_events_link")]

    operations = [migrations.RunPython(add_footer_utility_links, migrations.RunPython.noop)]
