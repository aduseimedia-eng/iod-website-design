from django.db import migrations


def import_news(apps, schema_editor):
    Page = apps.get_model('content', 'CMSPage')
    Article = apps.get_model('content', 'CMSArticle')
    Revision = apps.get_model('content', 'CMSArticleRevision')
    fallback_body = "Good governance is increasingly central to the long-term resilience and credibility of organisations. That was the focus of a recent IoD-Gh discussion with directors and governance leaders.\n\nThe session explored the responsibility of boards to act with independence, clarity and a strong sense of purpose. Participants reflected on how boards can improve the quality of challenge while sustaining the trust that enables good decisions.\n\nIoD-Gh will continue to create spaces for practical learning and thoughtful exchange. The Institute’s programmes and resources are designed to give directors the perspective needed to respond to an evolving environment."
    for page in Page.objects.filter(path__startswith='/news/', template_key='legacy', is_deleted=False):
        slug = page.path.removeprefix('/news/')
        if Article.objects.filter(slug=slug).exists():
            continue
        article = Article.objects.create(slug=slug, content_type='news', created_by=page.created_by, updated_by=page.updated_by)
        for source, state in [(page.published_revision, 'published'), (page.current_draft_revision, 'draft')]:
            if not source:
                continue
            fields = source.sections.filter(slot='page_copy').first()
            body = source.body or ('\n\n'.join(f['value'] for f in fields.data.get('fields', []) if f.get('label') == 'Text') if fields else '') or fallback_body
            revision = Revision.objects.create(article=article, number=article.revisions.count() + 1, state=state, title=source.title, standfirst=source.summary, body=body, seo_title=source.seo_title, seo_description=source.seo_description, created_by=source.created_by, published_at=source.published_at, snapshot={'title': source.title, 'standfirst': source.summary, 'body': body})
            if state == 'published':
                article.published_revision = revision
            else:
                article.current_draft_revision = revision
        article.save()


class Migration(migrations.Migration):
    dependencies = [('content', '0006_simple_page_catalog')]
    operations = [migrations.RunPython(import_news, migrations.RunPython.noop)]
