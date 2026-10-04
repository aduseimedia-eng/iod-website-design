import "server-only";
import type { Metadata } from "next";
import { apiBaseUrl } from "./client";
import type { CmsPublicArticle, CmsPublicPage } from "./cms";

export async function publishedArticle(slug: string): Promise<CmsPublicArticle | null> {
  try { const response = await fetch(apiBaseUrl + "/api/v2/cms/articles/" + encodeURIComponent(slug) + "/", { cache: "no-store" }); return response.ok ? response.json() : null; } catch { return null; }
}
export async function publishedCmsPage(slug: string): Promise<CmsPublicPage | null> {
  try { const response = await fetch(apiBaseUrl + "/api/v2/cms/pages/" + encodeURIComponent(slug) + "/", { cache: "no-store" }); return response.ok ? response.json() : null; } catch { return null; }
}
export async function cmsMetadata(path: string): Promise<Metadata> {
  try {
    const response = await fetch(apiBaseUrl + "/api/v2/cms/pages/resolve/?path=" + encodeURIComponent(path), { cache: "no-store" });
    if (!response.ok) return {};
    const page: CmsPublicPage = await response.json();
    const revision = page.revision;
    return { title: revision.seo_title || revision.title, description: revision.seo_description || revision.summary, robots: revision.robots, alternates: revision.canonical_path ? { canonical: revision.canonical_path } : undefined, openGraph: { title: revision.seo_title || revision.title, description: revision.seo_description || revision.summary, images: revision.social_image ? [revision.social_image.file_url] : [] } };
  } catch { return {}; }
}
