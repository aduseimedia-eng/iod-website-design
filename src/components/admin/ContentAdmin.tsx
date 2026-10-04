"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { ApiError } from "@/lib/api/client";
import {
  ContentItem,
  ContentItemInput,
  ContentPage,
  ContentSection,
  contentSections,
  createContentItem,
  createContentPage,
  deleteContentItem,
  getContentItems,
  getContentPages,
  updateContentItem,
  updateContentPage,
} from "@/lib/api/content";

type PageDraft = Omit<ContentPage, "id" | "published_at">;

const blankPage = (): PageDraft => ({ slug: "", label: "", eyebrow: "", title: "", summary: "", body: "", blocks: [], status: "draft" });
const blankItem = (): ContentItemInput => ({ section: "hero", title: "", summary: "", href: "", metadata: {}, image_url: "", sort_order: 0, status: "draft" });

function getCta(blocks: unknown[]) {
  const cta = blocks.find((block) => typeof block === "object" && block !== null && "type" in block && (block as { type?: unknown }).type === "cta") as { label?: unknown; href?: unknown } | undefined;
  return { label: typeof cta?.label === "string" ? cta.label : "", href: typeof cta?.href === "string" ? cta.href : "" };
}

function withCta(blocks: unknown[], cta: { label: string; href: string }) {
  const otherBlocks = blocks.filter((block) => !(typeof block === "object" && block !== null && "type" in block && (block as { type?: unknown }).type === "cta"));
  return cta.label.trim() || cta.href.trim() ? [...otherBlocks, { type: "cta", label: cta.label, href: cta.href }] : otherBlocks;
}

export function ContentAdmin() {
  const [mode, setMode] = useState<"pages" | "items">("items");
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selectedPage, setSelectedPage] = useState<ContentPage | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [pageDraft, setPageDraft] = useState<PageDraft>(blankPage);
  const [itemDraft, setItemDraft] = useState<ContentItemInput>(blankItem);
  const [pageCta, setPageCta] = useState({ label: "", href: "" });
  const [itemSection, setItemSection] = useState<ContentSection | "all">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const [pageResult, itemResult] = await Promise.allSettled([getContentPages(), getContentItems()]);
    const problems: string[] = [];
    if (pageResult.status === "fulfilled") setPages(pageResult.value);
    else problems.push(pageResult.reason instanceof ApiError ? pageResult.reason.message : "We couldn't load page content.");
    if (itemResult.status === "fulfilled") setItems(itemResult.value);
    else problems.push(itemResult.reason instanceof ApiError ? itemResult.reason.message : "We couldn't load homepage content.");
    setError(problems.join(" "));
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleItems = useMemo(() => items.filter((item) => itemSection === "all" || item.section === itemSection), [items, itemSection]);

  const beginPage = (page?: ContentPage) => {
    setError("");
    if (!page) {
      setSelectedPage(null);
      setPageDraft(blankPage());
      setPageCta({ label: "", href: "" });
      return;
    }
    setSelectedPage(page);
    setPageDraft({ slug: page.slug, label: page.label, eyebrow: page.eyebrow, title: page.title, summary: page.summary, body: page.body, blocks: page.blocks, status: page.status });
    setPageCta(getCta(page.blocks));
  };

  const beginItem = (item?: ContentItem) => {
    setError("");
    if (!item) {
      setSelectedItem(null);
      setItemDraft(blankItem());
      return;
    }
    setSelectedItem(item);
    setItemDraft({ section: item.section, title: item.title, summary: item.summary, href: item.href, metadata: item.metadata, image_url: item.image_url, sort_order: item.sort_order, status: item.status });
  };

  const savePage = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...pageDraft, blocks: withCta(pageDraft.blocks, pageCta) };
      const saved = selectedPage ? await updateContentPage(selectedPage.id, payload) : await createContentPage(payload);
      setSelectedPage(saved);
      setPageDraft({ slug: saved.slug, label: saved.label, eyebrow: saved.eyebrow, title: saved.title, summary: saved.summary, body: saved.body, blocks: saved.blocks, status: saved.status });
      setPageCta(getCta(saved.blocks));
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We couldn't save this page.");
    } finally {
      setSaving(false);
    }
  };

  const saveItem = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const saved = selectedItem ? await updateContentItem(selectedItem.id, itemDraft) : await createContentItem(itemDraft);
      setSelectedItem(saved);
      setItemDraft({ section: saved.section, title: saved.title, summary: saved.summary, href: saved.href, metadata: saved.metadata, image_url: saved.image_url, sort_order: saved.sort_order, status: saved.status });
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We couldn't save this content item.");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async () => {
    if (!selectedItem || !window.confirm(`Delete “${selectedItem.title}”?`)) return;
    setSaving(true);
    setError("");
    try {
      await deleteContentItem(selectedItem.id);
      beginItem();
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "We couldn't delete this content item.");
    } finally {
      setSaving(false);
    }
  };

  const updateMeta = (key: string, value: string) => setItemDraft((current) => ({ ...current, metadata: { ...current.metadata, [key]: value } }));
  const meta = (key: string) => typeof itemDraft.metadata[key] === "string" ? itemDraft.metadata[key] as string : "";

  return (
    <section className="mt-10">
      <div className="border-l-2 border-[var(--color-accent)] bg-[var(--color-paper)] p-5"><p className="font-bold">Website content control</p><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-slate)]">Edit a page heading or a homepage card, then choose Draft or Published. Only published records appear on the public website. Lower sort numbers appear first.</p></div>
      <div className="mt-6 flex flex-wrap gap-2 border-b border-[var(--color-line)]"><Tab active={mode === "items"} onClick={() => setMode("items")}>Homepage sections</Tab><Tab active={mode === "pages"} onClick={() => setMode("pages")}>Page copy & headings</Tab></div>
      {error && <p role="alert" className="mt-5 border-l-2 border-[var(--color-error)] bg-red-50 p-4 text-sm">{error}</p>}
      {mode === "pages" ? <div className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]"><aside className="border border-[var(--color-line)] bg-white"><div className="flex items-center justify-between border-b border-[var(--color-line)] p-5"><p className="font-bold">Page content</p><button type="button" onClick={() => beginPage()} className="text-sm font-bold underline">New</button></div>{loading ? <p className="p-5 text-sm text-[var(--color-slate)]">Loading…</p> : pages.map((page) => <button type="button" onClick={() => beginPage(page)} key={page.id} className={`block w-full border-b border-[var(--color-line)] p-5 text-left ${selectedPage?.id === page.id ? "bg-[var(--color-paper)]" : "hover:bg-[var(--color-warm-white)]"}`}><span className="block font-bold">{page.label}</span><span className="mt-1 block text-xs text-[var(--color-slate)]">/{page.slug} · {page.status}</span></button>)}</aside><form onSubmit={savePage} className="border border-[var(--color-line)] bg-white p-6 sm:p-8"><p className="eyebrow">{selectedPage ? "Edit page copy" : "New page copy"}</p><h2 className="mt-3 font-serif text-3xl">{selectedPage?.label || "Create a content page"}</h2><div className="mt-7 grid gap-4 sm:grid-cols-2"><Field label="Internal label" required value={pageDraft.label} onChange={(value) => setPageDraft({ ...pageDraft, label: value })} /><Field label="URL slug" required value={pageDraft.slug} onChange={(value) => setPageDraft({ ...pageDraft, slug: value })} /><Field label="Eyebrow" value={pageDraft.eyebrow} onChange={(value) => setPageDraft({ ...pageDraft, eyebrow: value })} /><StatusSelect value={pageDraft.status} onChange={(status) => setPageDraft({ ...pageDraft, status })} /></div><Field label="Page title" required value={pageDraft.title} onChange={(value) => setPageDraft({ ...pageDraft, title: value })} /><Area label="Summary" value={pageDraft.summary} onChange={(value) => setPageDraft({ ...pageDraft, summary: value })} /><Area label="Body content" value={pageDraft.body} onChange={(value) => setPageDraft({ ...pageDraft, body: value })} /><div className="mt-6 grid gap-4 border-t border-[var(--color-line)] pt-6 sm:grid-cols-2"><Field label="CTA label (optional)" value={pageCta.label} onChange={(value) => setPageCta({ ...pageCta, label: value })} /><Field label="CTA destination (optional)" value={pageCta.href} onChange={(value) => setPageCta({ ...pageCta, href: value })} /></div><SaveButton saving={saving} published={pageDraft.status === "published"} /></form></div> : <div className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]"><aside className="border border-[var(--color-line)] bg-white"><div className="border-b border-[var(--color-line)] p-5"><div className="flex items-center justify-between"><p className="font-bold">Homepage items</p><button type="button" onClick={() => beginItem()} className="text-sm font-bold underline">New</button></div><label className="mt-4 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-slate)]">Section<select value={itemSection} onChange={(event) => setItemSection(event.target.value as ContentSection | "all")} className="mt-2 h-10 w-full border border-[var(--color-line)] bg-white px-3 text-sm font-normal normal-case tracking-normal"><option value="all">All homepage sections</option>{contentSections.map((section) => <option value={section} key={section}>{section}</option>)}</select></label></div>{loading ? <p className="p-5 text-sm text-[var(--color-slate)]">Loading…</p> : visibleItems.map((item) => <button type="button" onClick={() => beginItem(item)} key={item.id} className={`block w-full border-b border-[var(--color-line)] p-5 text-left ${selectedItem?.id === item.id ? "bg-[var(--color-paper)]" : "hover:bg-[var(--color-warm-white)]"}`}><span className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-accent-dark)]">{item.section} · {item.status}</span><span className="mt-1 block font-bold">{item.title}</span><span className="mt-1 block text-xs text-[var(--color-slate)]">Position {item.sort_order}</span></button>)}</aside><form onSubmit={saveItem} className="border border-[var(--color-line)] bg-white p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">{selectedItem ? "Edit homepage item" : "New homepage item"}</p><h2 className="mt-3 font-serif text-3xl">{selectedItem?.title || "Create a homepage item"}</h2></div>{selectedItem && <button type="button" disabled={saving} onClick={() => void removeItem()} className="border border-[var(--color-error)] px-4 py-2 text-sm font-bold text-[var(--color-error)] disabled:opacity-50">Delete</button>}</div><div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Homepage section<select value={itemDraft.section} onChange={(event) => setItemDraft({ ...itemDraft, section: event.target.value as ContentSection })} className="mt-2 h-11 w-full border border-[var(--color-line)] bg-white px-3 font-normal">{contentSections.map((section) => <option key={section} value={section}>{section}</option>)}</select></label><StatusSelect value={itemDraft.status} onChange={(status) => setItemDraft({ ...itemDraft, status })} /><Field label="Title" required value={itemDraft.title} onChange={(value) => setItemDraft({ ...itemDraft, title: value })} /><Field label="Destination URL" value={itemDraft.href} onChange={(value) => setItemDraft({ ...itemDraft, href: value })} /></div><Area label="Summary / description" value={itemDraft.summary} onChange={(value) => setItemDraft({ ...itemDraft, summary: value })} /><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Image path or URL (optional)" value={itemDraft.image_url} onChange={(value) => setItemDraft({ ...itemDraft, image_url: value })} /><NumberField label="Sort order" value={itemDraft.sort_order} onChange={(value) => setItemDraft({ ...itemDraft, sort_order: value })} /><Field label="Display label / date / category" value={meta("display_meta")} onChange={(value) => updateMeta("display_meta", value)} /><Field label="Image alt text" value={meta("alt_text")} onChange={(value) => updateMeta("alt_text", value)} /></div>{itemDraft.section === "hero" && <div className="mt-6 border-t border-[var(--color-line)] pt-6"><p className="text-sm font-bold">Hero slide buttons</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Eyebrow" value={meta("eyebrow")} onChange={(value) => updateMeta("eyebrow", value)} /><Field label="Feature label" value={meta("feature")} onChange={(value) => updateMeta("feature", value)} /><Field label="Primary button label" value={meta("primary_label")} onChange={(value) => updateMeta("primary_label", value)} /><Field label="Primary button destination" value={meta("primary_href")} onChange={(value) => updateMeta("primary_href", value)} /><Field label="Secondary button label" value={meta("secondary_label")} onChange={(value) => updateMeta("secondary_label", value)} /><Field label="Secondary button destination" value={meta("secondary_href")} onChange={(value) => updateMeta("secondary_href", value)} /></div></div>}{itemDraft.section === "partners" && <div className="mt-6 grid gap-4 border-t border-[var(--color-line)] pt-6 sm:grid-cols-2"><Field label="Eyebrow" value={meta("eyebrow")} onChange={(value) => updateMeta("eyebrow", value)} /><Field label="Button label" value={meta("cta_label")} onChange={(value) => updateMeta("cta_label", value)} /></div>}<SaveButton saving={saving} published={itemDraft.status === "published"} /></form></div>}
    </section>
  );
}

function Tab({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`border-b-2 px-4 py-3 text-sm font-bold ${active ? "border-[var(--color-accent)] text-[var(--color-ink)]" : "border-transparent text-[var(--color-slate)] hover:text-[var(--color-ink)]"}`}>{children}</button>;
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="mt-4 block text-sm font-bold">{label}<input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full border border-[var(--color-line)] px-3 font-normal" /></label>;
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="mt-4 block text-sm font-bold">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-28 w-full border border-[var(--color-line)] p-3 font-normal" /></label>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="mt-4 block text-sm font-bold">{label}<input type="number" min="0" value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="mt-2 h-11 w-full border border-[var(--color-line)] px-3 font-normal" /></label>;
}

function StatusSelect({ value, onChange }: { value: "draft" | "published"; onChange: (value: "draft" | "published") => void }) {
  return <label className="mt-4 block text-sm font-bold">Publication status<select value={value} onChange={(event) => onChange(event.target.value as "draft" | "published")} className="mt-2 h-11 w-full border border-[var(--color-line)] bg-white px-3 font-normal"><option value="draft">Draft — hidden from public site</option><option value="published">Published — live on public site</option></select></label>;
}

function SaveButton({ saving, published }: { saving: boolean; published: boolean }) {
  return <button disabled={saving} className="mt-6 bg-[var(--color-ink)] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : published ? "Save and publish" : "Save draft"}</button>;
}
