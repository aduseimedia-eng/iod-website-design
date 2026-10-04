from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("content", "0016_add_video_list_section")]

    operations = [
        migrations.AlterField(
            model_name="cmspagesection",
            name="section_type",
            field=models.CharField(choices=[("gallery", "Gallery"), ("faq", "FAQ"), ("hero", "Hero"), ("rich_text", "Rich text"), ("callout", "Callout"), ("stat_grid", "Statistics"), ("card_grid", "Card grid"), ("feature_list", "Feature list"), ("quote", "Quote"), ("image", "Image"), ("image_with_copy", "Image with copy"), ("document_list", "Document list"), ("seminar_list", "Seminar list"), ("video_list", "Video list"), ("article_feed", "Article feed"), ("event_feed", "Event feed"), ("cta_banner", "CTA banner"), ("member_directory", "Member directory"), ("contact_details", "Contact details"), ("partner_logos", "Partner logos"), ("profile_gallery", "Profile photos"), ("exam_assessment", "Assessment questions")], max_length=40),
        ),
    ]
