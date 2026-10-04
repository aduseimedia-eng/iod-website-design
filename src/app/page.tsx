import { HomepageContent } from "@/components/content/HomepageContent";
import { cmsMetadata, publishedCmsPage } from "@/lib/api/cms-server";
import { knowledgeDocumentsFromPage, knowledgeSources } from "@/lib/knowledge-documents";

export function generateMetadata() { return cmsMetadata("/"); }

export default async function Home() {
  const pages = await Promise.all(knowledgeSources.map(async (source) => ({ source, page: await publishedCmsPage(source.slug) })));
  const documents = pages.flatMap(({ source, page }) => page ? knowledgeDocumentsFromPage(source, page) : []);
  return <HomepageContent initialKnowledgeItems={documents} initialKnowledgeLoaded />;
}
