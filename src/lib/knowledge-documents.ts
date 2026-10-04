import type { CmsPublicPage } from "@/lib/api/cms";

export type KnowledgeDocument = {
  id: string;
  title: string;
  summary: string;
  href: string;
  collection_href: string;
  collection_label: string;
  image_url: string;
  category: string;
  alt_text: string;
};

export const knowledgeSources = [
  { slug: "knowledge-research", label: "Research", fallbackHref: "/knowledge/research" },
  { slug: "knowledge-reports", label: "Reports", fallbackHref: "/knowledge/reports" },
  { slug: "knowledge-resources", label: "Resources", fallbackHref: "/knowledge/resources" },
] as const;

function safeUrl(value: unknown, fallback = "") {
  const url = typeof value === "string" ? value.trim() : "";
  return url.startsWith("/") || /^https?:\/\//i.test(url) ? url : fallback;
}

export function knowledgeDocumentsFromPage(source: (typeof knowledgeSources)[number], page: CmsPublicPage): KnowledgeDocument[] {
  return page.revision.sections.flatMap((section) => {
    if (section.section_type !== "document_list" || !section.is_enabled || !Array.isArray(section.data.items)) return [];
    return section.data.items.flatMap((value, index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const item = value as Record<string, unknown>;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!title) return [];
      const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : {};
      const category = typeof metadata.category === "string" && metadata.category.trim() ? metadata.category : source.label;
      return [{
        id: `${source.slug}-${typeof item.id === "string" ? item.id : index}`,
        title,
        summary: typeof item.description === "string" ? item.description : "",
        href: safeUrl(item.href, source.fallbackHref),
        collection_href: source.fallbackHref,
        collection_label: source.label,
        image_url: safeUrl(item.cover_image_url),
        category,
        alt_text: `Cover for ${title}`,
      }];
    });
  });
}
