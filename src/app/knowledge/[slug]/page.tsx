import { BuiltInSection } from "@/components/cms/BuiltInSection";

import { notFound } from "next/navigation";
import { ContentCard } from "@/components/cards/ContentCard";
import { KnowledgeHero } from "@/components/knowledge/KnowledgeHero";
import { MediaHero } from "@/components/media/MediaHero";
import { ReportsDocuments, ResearchDocuments, ResourcesDocuments } from "@/components/knowledge/ResourcesDocuments";
import { knowledgeItems } from "@/data/site";
import { publishedCmsPage } from "@/lib/api/cms-server";
const detail: Record<string, { title: string; description: string }> = {
  publications: {
    title: "Publications for thoughtful directors.",
    description:
      "Practical perspectives on governance, leadership and board effectiveness.",
  },
  reports: {
    title: "Reports that track our progress.",
    description: "Read the Institute’s annual reports and key publications.",
  },
  research: {
    title: "Research for a changing world.",
    description:
      "Evidence-led insight into the questions shaping governance today.",
  },
  resources: {
    title: "Resources for your boardroom.",
    description: "Useful frameworks, guides and reading for directors.",
  },
};
export function generateStaticParams() {
  return Object.keys(detail).map((slug) => ({ slug }));
}
export default async function KnowledgeDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const copy = detail[slug];
  if (!copy) notFound();
  const publications = slug === "publications";
  const initialLibraryPage = ["resources", "reports", "research"].includes(slug) ? await publishedCmsPage(`knowledge-${slug}`) : null;
  return (
    <>
      {publications ? (
        <MediaHero
          active="publications"
          eyebrow="IoD-Gh publications"
          {...copy}
        />
      ) : (
        <KnowledgeHero
          active={slug as "reports" | "research" | "resources"}
          eyebrow="Knowledge centre"
          {...copy}
        />
      )}
      {slug === "resources" ? <ResourcesDocuments initialPage={initialLibraryPage} /> : slug === "reports" ? <ReportsDocuments initialPage={initialLibraryPage} /> : slug === "research" ? <ResearchDocuments initialPage={initialLibraryPage} /> : <BuiltInSection sectionId="knowledge-articles" className="bg-white py-20 sm:py-28">
        <div className="site-container">
          <div className="grid gap-8 border-b border-[var(--color-line)] pb-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="eyebrow">
                {publications ? "Latest publications" : "Knowledge centre"}
              </p>
              <h2 className="mt-4 font-serif text-[clamp(2.25rem,3.5vw,3.75rem)] leading-[1.04] tracking-[-0.05em]">
                {publications
                  ? "Governance thinking for directors."
                  : "Explore the collection."}
              </h2>
            </div>
            <p className="max-w-md leading-7 text-[var(--color-slate)] lg:col-span-4 lg:col-start-9">
              {publications
                ? "Reports, guides and perspectives from the Institute and its governance community."
                : "Practical resources to support confident boardroom decisions."}
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {knowledgeItems.map((item, i) => (
              <ContentCard
                item={{ ...item, category: slug.slice(0, -1) }}
                index={i}
                key={item.title}
              />
            ))}
          </div>
        </div>
      </BuiltInSection>}
    </>
  );
}
