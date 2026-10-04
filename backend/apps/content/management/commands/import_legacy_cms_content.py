from django.core.management.base import BaseCommand

from apps.content.cms_services import publish_page_revision, save_page_draft
from apps.content.models import CMSPage, ContentPage


class Command(BaseCommand):
    help = "Copies legacy ContentPage records into revisioned CMS pages without changing the legacy records."

    def handle(self, *args, **options):
        imported = 0
        skipped = 0
        for legacy in ContentPage.objects.all().order_by("slug"):
            if CMSPage.objects.filter(slug=legacy.slug).exists():
                skipped += 1
                continue
            page = CMSPage.objects.create(
                # Existing components resolve these records by slug. The private
                # fallback path avoids colliding with public routes until an
                # editor deliberately assigns the page's canonical path.
                path=f"/_cms/{legacy.slug}",
                slug=legacy.slug,
                label=legacy.label,
                template_key="standard",
                created_by=legacy.updated_by,
                updated_by=legacy.updated_by,
            )
            revision = save_page_draft(
                page=page,
                actor=legacy.updated_by,
                data={
                    "label": legacy.label,
                    "path": page.path,
                    "slug": legacy.slug,
                    "template_key": "standard",
                    "eyebrow": legacy.eyebrow,
                    "title": legacy.title,
                    "summary": legacy.summary,
                    "body": legacy.body,
                    "seo_title": legacy.title,
                    "seo_description": legacy.summary[:320],
                    "canonical_path": "",
                    "robots": "index,follow",
                    "change_summary": "Imported from the previous CMS",
                    "sections": [{"slot": "main", "section_type": "rich_text", "position": 0, "data": {"legacy_blocks": legacy.blocks}, "is_enabled": True}],
                },
            )
            if legacy.status == ContentPage.Status.PUBLISHED:
                publish_page_revision(page=page, revision_number=revision.number)
            imported += 1
        self.stdout.write(self.style.SUCCESS(f"Imported {imported} legacy CMS page(s); skipped {skipped} existing revisioned page(s)."))
