from django.db import migrations


def simplify(apps, schema_editor):
    Page = apps.get_model('content', 'CMSPage')
    Revision = apps.get_model('content', 'CMSPageRevision')
    Section = apps.get_model('content', 'CMSPageSection')
    Item = apps.get_model('content', 'ContentItem')
    # Retain all source records and history. Only imported placeholder paths
    # are mapped; deliberately assigned paths remain untouched.
    names = {'about-page': 'About IoD-Ghana', 'about-council': 'Leadership', 'home': 'Home'}
    for page in Page.objects.filter(path__startswith='/_cms/').exclude(slug__startswith='home-'):
        root, _, rest = page.slug.partition('-')
        path = '/' + root if rest == 'page' else '/' + root + '/' + rest
        if Page.objects.filter(path=path).exclude(pk=page.pk).exists():
            continue
        page.path = path
        page.template_key = 'legacy'
        label = page.label
        for suffix in (' page hero', ' article hero', ' programme hero', ' hero'):
            if label.endswith(suffix):
                label = label[:-len(suffix)]
                break
        page.label = names.get(page.slug, label)
        page.save(update_fields=['path', 'label', 'template_key'])
    if Page.objects.filter(slug='home').exists() or Page.objects.filter(path='/').exists():
        return
    home = Page.objects.create(slug='home', path='/', label='Home', template_key='home', is_system_page=True)
    rev = Revision.objects.create(page=home, number=1, state='draft', title='Home', change_summary='Consolidated homepage content')
    blocks = []
    position = 0
    for name in ['hero', 'introduction', 'membership', 'training', 'knowledge', 'news', 'partners']:
        source = Page.objects.filter(slug='home-' + name).first()
        source_revision = source.published_revision if source else None
        data = {'home_section': name, 'heading': name.title()}
        if source_revision:
            data.update(heading=source_revision.title, eyebrow=source_revision.eyebrow, description=source_revision.summary, copy=source_revision.body)
            for section in source_revision.sections.all():
                for block in section.data.get('legacy_blocks', []):
                    if isinstance(block, dict) and block.get('type') == 'cta':
                        data.update(button_label=block.get('label', ''), button_href=block.get('href', ''))
        data['items'] = [{
            'id': str(item.id), 'title': item.title, 'description': item.summary, 'href': item.href,
            'image_url': item.image_url, 'metadata': item.metadata,
        } for item in Item.objects.filter(section=name, status='published').order_by('sort_order')]
        kind = 'hero' if name == 'hero' else 'image_with_copy' if name == 'introduction' else 'card_grid'
        Section.objects.create(revision=rev, slot='main', section_type=kind, position=position, data=data, is_enabled=True)
        blocks.append({'slot': 'main', 'section_type': kind, 'position': position, 'data': data, 'is_enabled': True})
        position += 1
    rev.snapshot = {'title': 'Home', 'sections': blocks}
    # Same previously published content; no private source drafts are published.
    rev.state = 'published'
    rev.save(update_fields=['snapshot', 'state'])
    home.published_revision = rev
    home.save(update_fields=['published_revision'])


class Migration(migrations.Migration):
    dependencies = [('content', '0005_alter_cmspagesection_section_type')]
    operations = [migrations.RunPython(simplify, migrations.RunPython.noop)]
