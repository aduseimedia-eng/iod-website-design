"use client";

import { BuiltInSection } from "@/components/cms/BuiltInSection";

import { EditableCopy } from "@/components/cms/EditableCopy";


import { ContentCard } from "@/components/cards/ContentCard";
import { cmsCta, cmsHref, useCmsItems, useCmsPage } from "@/components/content/useCmsContent";
import { MembershipHero } from "@/components/membership/MembershipHero";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { membershipCategories } from "@/data/site";

const fallbackItems = membershipCategories.map((item, index) => ({ id: `membership-${index}`, title: item.title, summary: item.description, href: item.href, metadata: { display_meta: item.meta || "" }, image_url: "", sort_order: index + 1 }));
const fallbackPage = { eyebrow: "Membership", title: "Find your place in Ghana's director community.", summary: "Membership is a commitment to professional growth, better governance and the confidence to lead with purpose.", body: "", blocks: [{ type: "cta", label: "Begin your application", href: "/membership/apply" }] };

export default function MembershipPage() {
  const page = useCmsPage("membership-page", fallbackPage);
  const items = useCmsItems("membership", fallbackItems);
  const cta = cmsCta(page.blocks, { label: "Begin your application", href: "/membership/apply" });

  return <><MembershipHero eyebrow={page.eyebrow} title={page.title} description={page.summary}><Button href={cta.href} variant="secondary" className="border-white text-white hover:bg-white hover:text-[var(--color-ink)]"><EditableCopy label="Link text" fallback={String(cta.label ?? "")} /></Button></MembershipHero><BuiltInSection sectionId="membership-pathways" className="bg-white py-20 sm:py-28"><div className="site-container"><SectionHeading eyebrow="Choose your pathway" title="Membership that meets you where you are." /><div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-5">{items.map((item, index) => <ContentCard item={{ title: item.title, description: item.summary, href: cmsHref(item.href), meta: typeof item.metadata.display_meta === "string" ? item.metadata.display_meta : "" }} index={index} key={item.id} />)}</div></div></BuiltInSection><BuiltInSection sectionId="membership-register" className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-20 sm:py-24"><div className="site-container grid gap-10 lg:grid-cols-12 lg:items-end"><div className="lg:col-span-7"><p className="eyebrow"><EditableCopy label="Text" fallback={"Membership register"} /></p><h2 className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.02] tracking-[-0.05em]"><EditableCopy label="Heading" fallback={"Members in good standing."} /></h2><p className="mt-5 max-w-xl leading-7 text-[var(--color-slate)]"><EditableCopy label="Text" fallback={"A public register recognising IoD-Gh members whose membership standing is current."} /></p></div><div className="lg:col-span-4 lg:col-start-9"><Button href="/membership/members-in-good-standing" className="w-full"><EditableCopy label="Link text" fallback={"View members in good standing"} /></Button></div></div></BuiltInSection></>;
}
