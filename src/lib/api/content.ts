import { apiRequest } from "./client";

export type ContentPage = { id: string; slug: string; label: string; eyebrow: string; title: string; summary: string; body: string; blocks: unknown[]; status: "draft" | "published"; published_at: string | null };
export const getContentPages = () => apiRequest<ContentPage[]>("/content/staff/pages/");
export const createContentPage = (data: Omit<ContentPage, "id" | "published_at">) => apiRequest<ContentPage>("/content/staff/pages/", { method: "POST", body: JSON.stringify(data) });
export const updateContentPage = (id: string, data: Partial<ContentPage>) => apiRequest<ContentPage>(`/content/staff/pages/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
export const getPublishedContentPage = (slug: string) => apiRequest<ContentPage>(`/content/pages/${encodeURIComponent(slug)}/`);

export const contentSections = ["hero", "membership", "training", "knowledge", "news", "events", "services", "partners"] as const;
export type ContentSection = (typeof contentSections)[number];
export type ContentStatus = "draft" | "published";

export type ContentItem = {
  id: string;
  section: ContentSection;
  title: string;
  summary: string;
  href: string;
  metadata: Record<string, unknown>;
  image_url: string;
  sort_order: number;
  status: ContentStatus;
  published_at: string | null;
  updated_by_email: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentItemInput = Pick<ContentItem, "section" | "title" | "summary" | "href" | "metadata" | "image_url" | "sort_order" | "status">;

export const getContentItems = (filters: Partial<Pick<ContentItem, "section" | "status">> = {}) => {
  const params = new URLSearchParams();
  if (filters.section) params.set("section", filters.section);
  if (filters.status) params.set("status", filters.status);
  const query = params.toString();
  return apiRequest<ContentItem[]>(`/content/staff/items/${query ? `?${query}` : ""}`);
};

export const createContentItem = (data: ContentItemInput) => apiRequest<ContentItem>("/content/staff/items/", { method: "POST", body: JSON.stringify(data) });
export const updateContentItem = (id: string, data: Partial<ContentItemInput>) => apiRequest<ContentItem>(`/content/staff/items/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteContentItem = (id: string) => apiRequest<void>(`/content/staff/items/${id}/`, { method: "DELETE" });
export const getPublishedContentItems = (section: ContentSection) => apiRequest<ContentItem[]>(`/content/items/?section=${encodeURIComponent(section)}`);
