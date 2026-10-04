
"use client";

import Image from "next/image";

import { useCmsPage } from "@/components/content/useCmsContent";
import { MediaHero } from "@/components/media/MediaHero";

type GalleryPhoto = { id: string; title: string; description: string; imageUrl: string; alt: string };
const fallbackPage = { eyebrow: "IoD-Gh media", title: "Event gallery.", summary: "A visual record of IoD-Gh gatherings, conversations and professional development moments.", body: "", blocks: [] };

function galleryPhotos(blocks: unknown[]): GalleryPhoto[] {
  return blocks.flatMap((block, blockIndex) => {
    if (!block || typeof block !== "object" || (block as { type?: unknown }).type !== "gallery") return [];
    const items = (block as { items?: unknown }).items;
    if (!Array.isArray(items)) return [];
    return items.flatMap((item, itemIndex) => {
      if (!item || typeof item !== "object") return [];
      const photo = item as { id?: unknown; title?: unknown; description?: unknown; image_url?: unknown; metadata?: unknown };
      const imageUrl = typeof photo.image_url === "string" ? photo.image_url.trim() : "";
      if (!imageUrl) return [];
      const metadata = photo.metadata && typeof photo.metadata === "object" && !Array.isArray(photo.metadata) ? photo.metadata as { alt_text?: unknown } : {};
      const title = typeof photo.title === "string" ? photo.title.trim() : "";
      return [{ id: typeof photo.id === "string" ? photo.id : `${blockIndex}-${itemIndex}`, title, description: typeof photo.description === "string" ? photo.description.trim() : "", imageUrl, alt: typeof metadata.alt_text === "string" && metadata.alt_text.trim() ? metadata.alt_text : title || "IoD-Gh event photograph" }];
    });
  });
}

export default function EventGalleryPage() {
  const page = useCmsPage("media-event-gallery", fallbackPage);
  const photos = galleryPhotos(page.blocks);
  const gallery = page.blocks.find((block) => !!block && typeof block === "object" && (block as { type?: unknown }).type === "gallery") as { heading?: unknown; description?: unknown } | undefined;
  const heading = typeof gallery?.heading === "string" && gallery.heading.trim() ? gallery.heading : "IoD-Gh in pictures";
  const introduction = typeof gallery?.description === "string" && gallery.description.trim() ? gallery.description : "A selection of moments from our gatherings, conversations and professional development programmes.";
  return (
    <>
      <MediaHero
        active="gallery"
        eyebrow="IoD-Gh media"
        title="Event gallery."
        description="A visual record of IoD-Gh gatherings, conversations and professional development moments."
      />
      <section className="bg-white py-20 sm:py-28">
        <div className="site-container">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="eyebrow">{heading}</p>
              <h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]">Moments that bring the director community together.</h2>
            </div>
            <p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9">{introduction}</p>
          </div>
          {photos.length ? <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{photos.map((photo) => <figure className="group overflow-hidden border border-[var(--color-line)] bg-[var(--color-warm-white)]" key={photo.id}><div className="relative aspect-[3/4] overflow-hidden"><Image src={photo.imageUrl} alt={photo.alt} fill unoptimized sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transform-none" /></div>{(photo.title || photo.description) && <figcaption className="border-t border-[var(--color-line)] p-5">{photo.title && <p className="font-serif text-2xl tracking-[-0.03em] text-[var(--color-ink)]">{photo.title}</p>}{photo.description && <p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">{photo.description}</p>}</figcaption>}</figure>)}</div> : <div className="mt-12 border border-dashed border-[var(--color-line)] bg-[var(--color-warm-white)] p-8 text-[var(--color-slate)]"><p className="font-semibold text-[var(--color-ink)]">Event photos will appear here.</p><p className="mt-2 text-sm">The gallery is ready for the next IoD-Gh event.</p></div>}
        </div>
      </section>
    </>
  );
}
