from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("content", "0014_add_research_document_list")]

    operations = [
        migrations.AddField(
            model_name="cmsarticlerevision",
            name="gallery_media",
            field=models.ManyToManyField(blank=True, related_name="article_gallery_revisions", to="content.cmsmediaasset"),
        ),
    ]
