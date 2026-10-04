import { MembershipAdmin } from "@/components/admin/MembershipAdmin";
import { DirectoryAdmin } from "@/components/admin/DirectoryAdmin";
import { CmsAdmin } from "@/components/admin/CmsAdmin";
import { PortalSidebar } from "@/components/layout/PortalSidebar";
import { redirect } from "next/navigation";

const titles: Record<string, string> = {
  overview: "Admin overview",
  members: "Members",
  applications: "Membership applications",
  directory: "Members in good standing",
  content: "Pages",
  media: "Media Library",
  navigation: "Navigation",
  events: "Events",
  training: "Training",
  cpd: "CPD",
  news: "News",
  resources: "Resources",
  staff: "Staff",
  roles: "Roles",
  "audit-logs": "Audit logs",
  settings: "Settings",
};

export function generateStaticParams() {
  return [{ section: [] }, ...Object.keys(titles).map((section) => ({ section: [section] }))];
}

export default async function AdminPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = await params;
  const key = section?.[0] ?? "overview";
  const pageSlug = key === "content" ? section?.[1] : undefined;
  if (pageSlug?.startsWith("home-")) redirect("/admin/content/home");
  if (pageSlug?.startsWith("news-") && pageSlug !== "news-page") redirect("/admin/news");
  const title = pageSlug === "footer" ? "Site footer" : pageSlug ? "Edit Page" : titles[key] ?? "Admin";
  const cmsView = key === "content" ? "pages" : ["news", "media", "navigation", "settings"].includes(key) ? key : null;

  return <main className="grid min-h-[calc(100dvh-72px)] bg-[var(--color-warm-white)] md:grid-cols-[230px_1fr]"><PortalSidebar admin active={key} /><section className="min-w-0 p-5 sm:p-8"><h1 className="text-3xl tracking-tight">{title}</h1>{key === "directory" ? <DirectoryAdmin /> : cmsView ? <CmsAdmin key={cmsView + (pageSlug || "")} view={cmsView} pageSlug={pageSlug} /> : <MembershipAdmin section={key} title={title} />}</section></main>;
}
