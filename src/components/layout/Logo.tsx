"use client";

import Image from "next/image";
import Link from "next/link";
import { useSiteSettings } from "@/components/cms/SiteSettings";
import { linkUrl } from "@/components/cms/ContentRenderer";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  const settings = useSiteSettings();
  const logo = typeof settings.logo_url === "string" ? linkUrl(settings.logo_url) : "";
  const name = typeof settings.website_name === "string" ? settings.website_name : "";
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Institute of Directors Ghana home">
      <Image src={logo || "/images/iod-logo-white.png"} unoptimized={!!logo} alt="" width={48} height={48} priority className="h-11 w-11 object-contain" style={inverse || logo ? undefined : { filter: "brightness(0) saturate(100%) invert(12%) sepia(26%) saturate(3710%) hue-rotate(223deg) brightness(84%) contrast(101%)" }} />
      <span className={`leading-tight ${inverse ? "text-white" : "text-[var(--color-ink)]"}`}><span className="block text-sm font-bold">{name || "Institute of Directors"}</span>{!name && <span className="block text-xs tracking-[0.14em]">GHANA</span>}</span>
    </Link>
  );
}
