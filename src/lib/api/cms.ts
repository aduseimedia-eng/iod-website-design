import { apiRequestAt } from "./client";

const base = "/api/v2/cms";

export type CmsRevisionState = "draft" | "in_review" | "scheduled" | "published" | "archived" | "superseded";
export type CmsMedia = { id: string; file: string; file_url: string; original_filename: string; mime_type: string; byte_size: number; alt_text: string; caption: string; credit: string; kind: "image" | "document" | "video" | "audio"; status: "ready" | "archived"; created_at: string; updated_at: string };
export type CmsSection = { id?: string; slot: string; section_type: string; position: number; data: Record<string, unknown>; primary_media?: CmsMedia | null; primary_media_id?: string | null; is_enabled: boolean };
export type CmsPageRevision = { id: string; number: number; state: CmsRevisionState; eyebrow: string; title: string; summary: string; body: string; seo_title: string; seo_description: string; canonical_path: string; robots: string; social_image: CmsMedia | null; sections: CmsSection[]; change_summary: string; review_note: string; created_by_name: string; published_at: string | null; created_at: string };
export type CmsPage = { id: string; path: string; slug: string; label: string; template_key: string; is_system_page: boolean; published_revision_number: number | null; current_draft_revision_number: number | null; live_title: string | null; created_at: string; updated_at: string; published_revision?: CmsPageRevision | null; current_draft_revision?: CmsPageRevision | null; revisions?: CmsPageRevision[] };
export type CmsPageDraft = { label: string; path: string; slug: string; template_key: string; eyebrow: string; title: string; summary: string; body: string; seo_title: string; seo_description: string; canonical_path: string; robots: string; social_image?: string | null; sections: Array<Omit<CmsSection, "id" | "primary_media"> & { primary_media?: string | null }>; change_summary: string; base_revision_number?: number };

export type CmsCategory = { id: string; taxonomy: "news" | "insight" | "event" | "document"; name: string; slug: string; description: string; position: number; is_active: boolean };
export type CmsArticleRevision = { id: string; number: number; state: CmsRevisionState; title: string; standfirst: string; body: string; cover_media: CmsMedia | null; gallery_media: CmsMedia[]; seo_title: string; seo_description: string; change_summary: string; published_at: string | null; created_at: string };
export type CmsArticle = { id: string; slug: string; content_type: "news" | "insight" | "event" | "notice"; primary_category: CmsCategory | null; author_display_name: string; published_revision_number: number | null; current_draft_revision_number: number | null; live_title: string | null; updated_at: string; categories?: CmsCategory[]; published_revision?: CmsArticleRevision | null; current_draft_revision?: CmsArticleRevision | null; revisions?: CmsArticleRevision[] };
export type CmsArticleDraft = { slug: string; content_type: CmsArticle["content_type"]; primary_category?: string | null; categories: string[]; author_display_name: string; title: string; standfirst: string; body: string; cover_media?: string | null; gallery_media: string[]; seo_title: string; seo_description: string; change_summary: string };

export type CmsNavigationItem = { id?: string; parent_id?: string | null; parent_index?: number | null; position: number; label: string; link_type: "page" | "internal" | "external"; page_id?: string | null; page?: string | null; href: string; open_in_new_tab: boolean; is_enabled: boolean };
export type CmsNavigationRevision = { id: string; number: number; state: CmsRevisionState; items: CmsNavigationItem[]; change_summary: string; published_at: string | null; created_at: string };
export type CmsNavigationMenu = { id: string; key: string; label: string; published_revision: CmsNavigationRevision | null; current_draft_revision: CmsNavigationRevision | null; updated_at: string };
export type CmsSettingsRevision = { id: string; number: number; state: CmsRevisionState; data: Record<string, unknown>; change_summary: string; published_at: string | null; created_at: string };
export type CmsSettings = { id: string; key: string; published_revision: CmsSettingsRevision | null; current_draft_revision: CmsSettingsRevision | null; updated_at: string };

export type CmsPublicPage = { id: string; path: string; slug: string; template_key: string; revision: CmsPageRevision; published_at: string | null };
export type CmsPublicArticle = { id: string; slug: string; content_type: CmsArticle["content_type"]; category: CmsCategory | null; author_display_name: string; revision: CmsArticleRevision; published_at: string | null };

export const listCmsPages = () => apiRequestAt<CmsPage[]>(`${base}/staff/pages/`);
export const getPublishedCmsPage = (slug: string) => apiRequestAt<CmsPublicPage>(`${base}/pages/${encodeURIComponent(slug)}/`);
export const getPublishedCmsArticles = (type: CmsArticle["content_type"]) => apiRequestAt<CmsPublicArticle[]>(`${base}/articles/?type=${encodeURIComponent(type)}`);
export const getCmsPage = (id: string) => apiRequestAt<CmsPage>(`${base}/staff/pages/${id}/`);
export const deleteCmsPage = (id: string) => apiRequestAt<void>(`${base}/staff/pages/${id}/`, { method: "DELETE" });
export const createCmsPage = (data: CmsPageDraft) => apiRequestAt<CmsPage>(`${base}/staff/pages/`, { method: "POST", body: JSON.stringify(data) });
export const saveCmsPageDraft = (id: string, data: CmsPageDraft) => apiRequestAt<CmsPageRevision>(`${base}/staff/pages/${id}/drafts/`, { method: "POST", body: JSON.stringify(data) });
export const pageRevisionAction = (id: string, revision: number, action: "publish" | "restore" | "preview") => apiRequestAt<CmsPageRevision | { token: string; revision: CmsPageRevision }>(`${base}/staff/pages/${id}/revisions/${revision}/${action}/`, { method: "POST" });
export const unpublishCmsPage = (id: string) => apiRequestAt<void>(`${base}/staff/pages/${id}/unpublish/`, { method: "POST" });

export const listCmsMedia = () => apiRequestAt<CmsMedia[]>(`${base}/staff/media/`);
export const uploadCmsMedia = (form: FormData) => apiRequestAt<CmsMedia>(`${base}/staff/media/`, { method: "POST", body: form });
export const updateCmsMedia = (id: string, data: Partial<Pick<CmsMedia, "alt_text" | "caption" | "credit" | "status">>) => apiRequestAt<CmsMedia>(`${base}/staff/media/${id}/`, { method: "PATCH", body: JSON.stringify(data) });

export const listCmsCategories = () => apiRequestAt<CmsCategory[]>(`${base}/staff/categories/`);
export const createCmsCategory = (data: Omit<CmsCategory, "id">) => apiRequestAt<CmsCategory>(`${base}/staff/categories/`, { method: "POST", body: JSON.stringify(data) });
export const updateCmsCategory = (id: string, data: Partial<CmsCategory>) => apiRequestAt<CmsCategory>(`${base}/staff/categories/${id}/`, { method: "PATCH", body: JSON.stringify(data) });

export const listCmsArticles = () => apiRequestAt<CmsArticle[]>(`${base}/staff/articles/`);
export const getCmsArticle = (id: string) => apiRequestAt<CmsArticle>(`${base}/staff/articles/${id}/`);
export const deleteCmsArticle = (id: string) => apiRequestAt<void>(`${base}/staff/articles/${id}/`, { method: "DELETE" });
export const createCmsArticle = (data: CmsArticleDraft) => apiRequestAt<CmsArticle>(`${base}/staff/articles/`, { method: "POST", body: JSON.stringify(data) });
export const saveCmsArticleDraft = (id: string, data: CmsArticleDraft) => apiRequestAt<CmsArticleRevision>(`${base}/staff/articles/${id}/drafts/`, { method: "POST", body: JSON.stringify(data) });
export const publishCmsArticle = (id: string, revision: number) => apiRequestAt<CmsArticleRevision>(`${base}/staff/articles/${id}/revisions/${revision}/publish/`, { method: "POST" });

export const listCmsMenus = () => apiRequestAt<CmsNavigationMenu[]>(`${base}/staff/navigation/menus/`);
export const getPublishedCmsMenu = (key: string) => apiRequestAt<Omit<CmsNavigationMenu, "current_draft_revision">>(`${base}/navigation/${encodeURIComponent(key)}/`);
export const getCmsMenu = (id: string) => apiRequestAt<CmsNavigationMenu>(`${base}/staff/navigation/menus/${id}/`);
export const createCmsMenu = (data: Pick<CmsNavigationMenu, "key" | "label">) => apiRequestAt<CmsNavigationMenu>(`${base}/staff/navigation/menus/`, { method: "POST", body: JSON.stringify(data) });
export const saveCmsMenuDraft = (id: string, data: { items: CmsNavigationItem[]; change_summary: string }) => apiRequestAt<CmsNavigationMenu>(`${base}/staff/navigation/menus/${id}/drafts/`, { method: "POST", body: JSON.stringify(data) });
export const publishCmsMenu = (id: string, revision: number) => apiRequestAt<CmsNavigationMenu>(`${base}/staff/navigation/menus/${id}/revisions/${revision}/publish/`, { method: "POST" });

export const getCmsSettings = () => apiRequestAt<CmsSettings>(`${base}/staff/settings/`);
export const saveCmsSettingsDraft = (data: { data: Record<string, unknown>; change_summary: string }) => apiRequestAt<CmsSettings>(`${base}/staff/settings/drafts/`, { method: "POST", body: JSON.stringify(data) });
export const publishCmsSettings = (revision: number) => apiRequestAt<CmsSettings>(`${base}/staff/settings/revisions/${revision}/publish/`, { method: "POST" });
