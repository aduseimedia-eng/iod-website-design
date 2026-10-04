import { cmsMetadata } from "@/lib/api/cms-server";

export async function generateMetadata({ params }: { params: Promise<{ slug?: string; event?: string; article?: string }> }) {
  const { slug, event, article } = await params;
  return cmsMetadata("/about" + (slug || event || article ? "/" + (slug || event || article) : ""));
}
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
