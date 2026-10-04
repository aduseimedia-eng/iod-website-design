from __future__ import annotations

from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import (
    CMSArticle,
    CMSArticleRevision,
    CMSNavigationItem,
    CMSNavigationMenu,
    CMSNavigationRevision,
    CMSPage,
    CMSPageRevision,
    CMSPageSection,
    CMSSiteSettings,
    CMSSiteSettingsRevision,
    CMSRevisionState,
)


def _next_number(queryset) -> int:
    return (queryset.aggregate(latest=Max("number"))["latest"] or 0) + 1


def _media_id(value):
    return str(value.id) if value else None


def _page_snapshot(data: dict) -> dict:
    sections = []
    for section in data.get("sections", []):
        sections.append(
            {
                "slot": section.get("slot", "main"),
                "section_type": section["section_type"],
                "position": section["position"],
                "data": section.get("data", {}),
                "primary_media": _media_id(section.get("primary_media")),
                "is_enabled": section.get("is_enabled", True),
            }
        )
    return {
        "eyebrow": data.get("eyebrow", ""),
        "title": data["title"],
        "summary": data.get("summary", ""),
        "body": data.get("body", ""),
        "seo_title": data.get("seo_title", ""),
        "seo_description": data.get("seo_description", ""),
        "canonical_path": data.get("canonical_path", ""),
        "robots": data.get("robots", "index,follow"),
        "social_image": _media_id(data.get("social_image")),
        "sections": sections,
    }


@transaction.atomic
def save_page_draft(*, page: CMSPage, data: dict, actor) -> CMSPageRevision:
    page = CMSPage.objects.select_for_update().get(pk=page.pk)
    base_revision = data.pop("base_revision_number", None)
    current = page.current_draft_revision or page.published_revision
    if base_revision is not None and current and current.number != base_revision:
        raise ValidationError({"base_revision_number": ["This page has changed. Refresh it before saving your draft."]})

    previous_draft = page.current_draft_revision
    if previous_draft and previous_draft.state == CMSRevisionState.DRAFT:
        previous_draft.state = CMSRevisionState.SUPERSEDED
        previous_draft.save(update_fields=["state"])

    for field in ("label", "path", "slug", "template_key"):
        if field in data:
            setattr(page, field, data[field])
    page.updated_by = actor
    page.save()

    snapshot = _page_snapshot(data)
    revision = CMSPageRevision.objects.create(
        page=page,
        number=_next_number(page.revisions),
        state=CMSRevisionState.DRAFT,
        eyebrow=data.get("eyebrow", ""),
        title=data["title"],
        summary=data.get("summary", ""),
        body=data.get("body", ""),
        seo_title=data.get("seo_title", ""),
        seo_description=data.get("seo_description", ""),
        canonical_path=data.get("canonical_path", ""),
        robots=data.get("robots", "index,follow"),
        social_image=data.get("social_image"),
        change_summary=data.get("change_summary", ""),
        snapshot=snapshot,
        created_by=actor,
    )
    CMSPageSection.objects.bulk_create(
        [
            CMSPageSection(
                revision=revision,
                slot=section.get("slot", "main"),
                section_type=section["section_type"],
                position=section["position"],
                data=section.get("data", {}),
                primary_media=section.get("primary_media"),
                is_enabled=section.get("is_enabled", True),
            )
            for section in data.get("sections", [])
        ]
    )
    page.current_draft_revision = revision
    page.save(update_fields=["current_draft_revision", "updated_at"])
    return revision


@transaction.atomic
def publish_page_revision(*, page: CMSPage, revision_number: int) -> CMSPageRevision:
    page = CMSPage.objects.select_for_update().get(pk=page.pk)
    try:
        revision = page.revisions.select_for_update().get(number=revision_number)
    except CMSPageRevision.DoesNotExist as error:
        raise ValidationError({"revision": ["The page revision was not found."]}) from error
    if revision.state in {CMSRevisionState.ARCHIVED, CMSRevisionState.SUPERSEDED}:
        raise ValidationError({"revision": ["Restore this historical revision to a draft before publishing it."]})
    if page.published_revision_id and page.published_revision_id != revision.id:
        old_live = page.published_revision
        old_live.state = CMSRevisionState.ARCHIVED
        old_live.save(update_fields=["state"])
    revision.state = CMSRevisionState.PUBLISHED
    revision.published_at = timezone.now()
    revision.save(update_fields=["state", "published_at"])
    page.published_revision = revision
    if page.current_draft_revision_id == revision.id:
        page.current_draft_revision = None
    page.save(update_fields=["published_revision", "current_draft_revision", "updated_at"])
    return revision


@transaction.atomic
def unpublish_page(*, page: CMSPage) -> None:
    page = CMSPage.objects.select_for_update().get(pk=page.pk)
    if page.published_revision_id:
        revision = page.published_revision
        revision.state = CMSRevisionState.ARCHIVED
        revision.save(update_fields=["state"])
        page.published_revision = None
        page.save(update_fields=["published_revision", "updated_at"])


def restore_page_revision(*, page: CMSPage, revision_number: int, actor) -> CMSPageRevision:
    try:
        source = page.revisions.prefetch_related("sections").get(number=revision_number)
    except CMSPageRevision.DoesNotExist as error:
        raise ValidationError({"revision": ["The page revision was not found."]}) from error
    return save_page_draft(
        page=page,
        actor=actor,
        data={
            "label": page.label,
            "path": page.path,
            "slug": page.slug,
            "template_key": page.template_key,
            "eyebrow": source.eyebrow,
            "title": source.title,
            "summary": source.summary,
            "body": source.body,
            "seo_title": source.seo_title,
            "seo_description": source.seo_description,
            "canonical_path": source.canonical_path,
            "robots": source.robots,
            "social_image": source.social_image,
            "change_summary": f"Restored from revision {source.number}",
            "sections": [
                {
                    "slot": section.slot,
                    "section_type": section.section_type,
                    "position": section.position,
                    "data": section.data,
                    "primary_media": section.primary_media,
                    "is_enabled": section.is_enabled,
                }
                for section in source.sections.all()
            ],
        },
    )


def _article_metadata(article: CMSArticle) -> dict:
    category = article.primary_category
    return {
        "author_display_name": article.author_display_name,
        "category": {
            "id": str(category.id), "taxonomy": category.taxonomy,
            "name": category.name, "slug": category.slug,
            "description": category.description, "position": category.position,
            "is_active": category.is_active,
        } if category else None,
    }


def _article_snapshot(data: dict) -> dict:
    return {
        "title": data["title"],
        "standfirst": data.get("standfirst", ""),
        "body": data.get("body", ""),
        "cover_media": _media_id(data.get("cover_media")),
        "gallery_media": [_media_id(media) for media in data.get("gallery_media", [])],
        "seo_title": data.get("seo_title", ""),
        "seo_description": data.get("seo_description", ""),
    }


@transaction.atomic
def save_article_draft(*, article: CMSArticle, data: dict, actor) -> CMSArticleRevision:
    article = CMSArticle.objects.select_for_update().get(pk=article.pk)
    gallery_media = data.get("gallery_media")
    if gallery_media is None:
        source_revision = article.current_draft_revision or article.published_revision
        gallery_media = list(source_revision.gallery_media.all()) if source_revision else []
    # Older revisions did not snapshot the byline/category. Freeze the existing
    # live values before changing the editable record, so Save Draft stays private.
    if article.published_revision_id:
        live = article.published_revision
        live.snapshot = {**_article_metadata(article), **live.snapshot}
        live.save(update_fields=["snapshot"])
    previous_draft = article.current_draft_revision
    if previous_draft and previous_draft.state == CMSRevisionState.DRAFT:
        previous_draft.state = CMSRevisionState.SUPERSEDED
        previous_draft.save(update_fields=["state"])
    for field in ("slug", "content_type", "primary_category", "author_display_name"):
        if field in data:
            setattr(article, field, data[field])
    article.updated_by = actor
    article.save()
    if "categories" in data:
        article.categories.set(data["categories"])
    revision = CMSArticleRevision.objects.create(
        article=article,
        number=_next_number(article.revisions),
        state=CMSRevisionState.DRAFT,
        title=data["title"],
        standfirst=data.get("standfirst", ""),
        body=data.get("body", ""),
        cover_media=data.get("cover_media"),
        seo_title=data.get("seo_title", ""),
        seo_description=data.get("seo_description", ""),
        snapshot={**_article_snapshot(data), **_article_metadata(article)},
        change_summary=data.get("change_summary", ""),
        created_by=actor,
    )
    revision.gallery_media.set(gallery_media)
    article.current_draft_revision = revision
    article.save(update_fields=["current_draft_revision", "updated_at"])
    return revision


@transaction.atomic
def publish_article_revision(*, article: CMSArticle, revision_number: int) -> CMSArticleRevision:
    article = CMSArticle.objects.select_for_update().get(pk=article.pk)
    try:
        revision = article.revisions.select_for_update().get(number=revision_number)
    except CMSArticleRevision.DoesNotExist as error:
        raise ValidationError({"revision": ["The article revision was not found."]}) from error
    if article.published_revision_id and article.published_revision_id != revision.id:
        old_live = article.published_revision
        old_live.state = CMSRevisionState.ARCHIVED
        old_live.save(update_fields=["state"])
    revision.state = CMSRevisionState.PUBLISHED
    revision.published_at = timezone.now()
    revision.save(update_fields=["state", "published_at"])
    article.published_revision = revision
    if article.current_draft_revision_id == revision.id:
        article.current_draft_revision = None
    article.save(update_fields=["published_revision", "current_draft_revision", "updated_at"])
    return revision


@transaction.atomic
def save_navigation_draft(*, menu: CMSNavigationMenu, data: dict, actor) -> CMSNavigationRevision:
    menu = CMSNavigationMenu.objects.select_for_update().get(pk=menu.pk)
    old = menu.current_draft_revision
    if old and old.state == CMSRevisionState.DRAFT:
        old.state = CMSRevisionState.SUPERSEDED
        old.save(update_fields=["state"])
    items_data = data.get("items", [])
    snapshot = [
        {
            "parent_index": item.get("parent_index"),
            "position": item.get("position", index),
            "label": item["label"],
            "link_type": item.get("link_type", CMSNavigationItem.LinkType.INTERNAL),
            "page": _media_id(item.get("page")),
            "href": item.get("href", ""),
            "open_in_new_tab": item.get("open_in_new_tab", False),
            "is_enabled": item.get("is_enabled", True),
        }
        for index, item in enumerate(items_data)
    ]
    revision = CMSNavigationRevision.objects.create(
        menu=menu,
        number=_next_number(menu.revisions),
        state=CMSRevisionState.DRAFT,
        snapshot=snapshot,
        change_summary=data.get("change_summary", ""),
        created_by=actor,
    )
    created = []
    for index, item in enumerate(items_data):
        parent_index = item.get("parent_index")
        parent = created[parent_index] if isinstance(parent_index, int) and 0 <= parent_index < len(created) else None
        created.append(
            CMSNavigationItem.objects.create(
                revision=revision,
                parent=parent,
                position=item.get("position", index),
                label=item["label"],
                link_type=item.get("link_type", CMSNavigationItem.LinkType.INTERNAL),
                page=item.get("page"),
                href=item.get("href", ""),
                open_in_new_tab=item.get("open_in_new_tab", False),
                is_enabled=item.get("is_enabled", True),
            )
        )
    menu.current_draft_revision = revision
    menu.save(update_fields=["current_draft_revision", "updated_at"])
    return revision


@transaction.atomic
def publish_navigation_revision(*, menu: CMSNavigationMenu, revision_number: int) -> CMSNavigationRevision:
    menu = CMSNavigationMenu.objects.select_for_update().get(pk=menu.pk)
    revision = menu.revisions.select_for_update().filter(number=revision_number).first()
    if not revision:
        raise ValidationError({"revision": ["The navigation revision was not found."]})
    if menu.published_revision_id and menu.published_revision_id != revision.id:
        old_live = menu.published_revision
        old_live.state = CMSRevisionState.ARCHIVED
        old_live.save(update_fields=["state"])
    revision.state = CMSRevisionState.PUBLISHED
    revision.published_at = timezone.now()
    revision.save(update_fields=["state", "published_at"])
    menu.published_revision = revision
    if menu.current_draft_revision_id == revision.id:
        menu.current_draft_revision = None
    menu.save(update_fields=["published_revision", "current_draft_revision", "updated_at"])
    return revision


@transaction.atomic
def save_settings_draft(*, settings: CMSSiteSettings, data: dict, actor) -> CMSSiteSettingsRevision:
    settings = CMSSiteSettings.objects.select_for_update().get(pk=settings.pk)
    old = settings.current_draft_revision
    if old and old.state == CMSRevisionState.DRAFT:
        old.state = CMSRevisionState.SUPERSEDED
        old.save(update_fields=["state"])
    revision = CMSSiteSettingsRevision.objects.create(
        settings=settings,
        number=_next_number(settings.revisions),
        state=CMSRevisionState.DRAFT,
        data=data["data"],
        change_summary=data.get("change_summary", ""),
        created_by=actor,
    )
    settings.current_draft_revision = revision
    settings.save(update_fields=["current_draft_revision", "updated_at"])
    return revision


@transaction.atomic
def publish_settings_revision(*, settings: CMSSiteSettings, revision_number: int) -> CMSSiteSettingsRevision:
    settings = CMSSiteSettings.objects.select_for_update().get(pk=settings.pk)
    revision = settings.revisions.select_for_update().filter(number=revision_number).first()
    if not revision:
        raise ValidationError({"revision": ["The settings revision was not found."]})
    if settings.published_revision_id and settings.published_revision_id != revision.id:
        old_live = settings.published_revision
        old_live.state = CMSRevisionState.ARCHIVED
        old_live.save(update_fields=["state"])
    revision.state = CMSRevisionState.PUBLISHED
    revision.published_at = timezone.now()
    revision.save(update_fields=["state", "published_at"])
    settings.published_revision = revision
    if settings.current_draft_revision_id == revision.id:
        settings.current_draft_revision = None
    settings.save(update_fields=["published_revision", "current_draft_revision", "updated_at"])
    return revision
