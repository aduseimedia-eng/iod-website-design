import { PortalSidebar } from "@/components/layout/PortalSidebar";
import { MemberPortal } from "@/components/member/MemberPortal";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  profile: "My profile",
  membership: "Membership",
  events: "Events",
  training: "Training",
  cpd: "CPD progress",
  documents: "Documents",
  notifications: "Notifications",
  settings: "Settings",
};

export function generateStaticParams() {
  return Object.keys(labels).map((section) => ({ section: [section] }));
}

export default async function MemberPage({ params }: { params: Promise<{ section: string[] }> }) {
  const { section } = await params;
  const key = section?.[0] ?? "dashboard";
  const title = labels[key] ?? "Member area";

  return <main className="grid bg-[var(--color-warm-white)] md:grid-cols-[260px_1fr]"><PortalSidebar active={key} /><section className="p-6 sm:p-10"><p className="eyebrow">Member area</p><h1 className="mt-4 font-serif text-5xl font-semibold tracking-[-0.05em]">{key === "dashboard" ? "Your IoD-Gh membership." : title}</h1><MemberPortal section={key} title={title} /></section></main>;
}
