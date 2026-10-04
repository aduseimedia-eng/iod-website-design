from django.db import migrations, models


def seed_exam_assessment(apps, schema_editor):
    Page = apps.get_model("content", "CMSPage")
    Section = apps.get_model("content", "CMSPageSection")
    try:
        page = Page.objects.get(slug="training-exams")
    except Page.DoesNotExist:
        return
    revision = page.published_revision or page.current_draft_revision
    if not revision or Section.objects.filter(revision=revision, section_type="exam_assessment").exists():
        return
    Section.objects.create(
        revision=revision,
        slot="main",
        position=1,
        section_type="exam_assessment",
        is_enabled=True,
        data={
            "heading": "Corporate governance assessment",
            "instructions": "Use the code issued by IoD-Gh. Read every question carefully, flag questions to review later, and submit only when you are ready.",
            "access_code": "IOD-GH-EXAM",
            "duration_minutes": "45",
            "pass_mark": "70",
            "show_answer_review": True,
            "questions": [
                {"id": "board-role", "prompt": "Which statement best describes the role of a board of directors?", "correct_option_id": "board-role-a", "options": [{"id": "board-role-a", "text": "To provide strategic direction and oversight."}, {"id": "board-role-b", "text": "To manage every daily operational activity."}, {"id": "board-role-c", "text": "To replace the executive management team."}, {"id": "board-role-d", "text": "To approve every individual expenditure."}]},
                {"id": "governance-principle", "prompt": "Which principle is essential to sound corporate governance?", "correct_option_id": "governance-principle-a", "options": [{"id": "governance-principle-a", "text": "Clear accountability and responsible decision-making."}, {"id": "governance-principle-b", "text": "Avoiding communication with stakeholders."}, {"id": "governance-principle-c", "text": "Delegating all board responsibilities externally."}, {"id": "governance-principle-d", "text": "Keeping organisational objectives informal."}]},
                {"id": "conflict", "prompt": "What should a director do when a conflict of interest arises?", "correct_option_id": "conflict-a", "options": [{"id": "conflict-a", "text": "Declare the interest and follow the appropriate process."}, {"id": "conflict-b", "text": "Keep it private to avoid delaying the meeting."}, {"id": "conflict-c", "text": "Vote on the matter without mentioning it."}, {"id": "conflict-d", "text": "Ask another director to decide informally."}]},
                {"id": "risk", "prompt": "Why should a board regularly review organisational risk?", "correct_option_id": "risk-a", "options": [{"id": "risk-a", "text": "To ensure material risks are understood and appropriately overseen."}, {"id": "risk-b", "text": "To transfer all risk decisions to external auditors."}, {"id": "risk-c", "text": "To eliminate every business risk before a decision is made."}, {"id": "risk-d", "text": "To limit reporting to financial risks only."}]},
            ],
        },
    )


class Migration(migrations.Migration):
    dependencies = [("content", "0010_add_profile_gallery_section")]

    operations = [
        migrations.AlterField(
            model_name="cmspagesection",
            name="section_type",
            field=models.CharField(
                choices=[
                    ("gallery", "Gallery"), ("faq", "FAQ"), ("hero", "Hero"),
                    ("rich_text", "Rich text"), ("callout", "Callout"),
                    ("stat_grid", "Statistics"), ("card_grid", "Card grid"),
                    ("feature_list", "Feature list"), ("quote", "Quote"),
                    ("image", "Image"), ("image_with_copy", "Image with copy"),
                    ("document_list", "Document list"), ("article_feed", "Article feed"),
                    ("event_feed", "Event feed"), ("cta_banner", "CTA banner"),
                    ("member_directory", "Member directory"), ("contact_details", "Contact details"),
                    ("partner_logos", "Partner logos"), ("profile_gallery", "Profile photos"),
                    ("exam_assessment", "Assessment questions"),
                ],
                max_length=40,
            ),
        ),
        migrations.RunPython(seed_exam_assessment, migrations.RunPython.noop),
    ]
