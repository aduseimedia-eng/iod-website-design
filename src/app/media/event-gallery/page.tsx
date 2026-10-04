
import { EditableCopy } from "@/components/cms/EditableCopy";
import { MediaHero } from "@/components/media/MediaHero";

const gallerySlots = [
  "Leadership forum",
  "Director roundtable",
  "Governance conversation",
  "Member reception",
  "Professional development",
  "Institute gathering",
];

export default function EventGalleryPage() {
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
              <p className="eyebrow"><EditableCopy label="Text" fallback={"IoD-Gh in pictures"} /></p>
              <h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Moments that bring the director community together."} /></h2>
            </div>
            <p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9"><EditableCopy label="Text" fallback={"Event photography will be posted here as new gatherings and programmes are held."} /></p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {gallerySlots.map((label, index) => (
              <article
                className="overflow-hidden border border-[var(--color-line)] bg-[var(--color-warm-white)]"
                key={label}
              >
                <div className="relative aspect-[4/3] bg-[var(--color-ink)]">
                  <span className="absolute -right-2 -top-8 font-serif text-[8rem] leading-none tracking-[-0.1em] text-white/10">
                    0{index + 1}
                  </span>
                  <p className="absolute bottom-5 left-5 text-xs font-bold tracking-[0.14em] text-[var(--color-accent-light)]"><EditableCopy label="Text" fallback={"EVENT PHOTO"} /></p>
                </div>
                <div className="border-t border-[var(--color-line)] p-5">
                  <p className="font-serif text-2xl tracking-[-0.03em] text-[var(--color-ink)]"><EditableCopy label="Text" fallback={String(label ?? "")} /></p>
                  <p className="mt-2 text-sm text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"Images to be added"} /></p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
