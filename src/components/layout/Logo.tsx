"use client";

import Image from "next/image";
import Link from "next/link";
import { useSiteSettings } from "@/components/cms/SiteSettings";
import { linkUrl } from "@/components/cms/ContentRenderer";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  const settings = useSiteSettings();
  const logo = typeof settings.logo_url === "string" ? linkUrl(settings.logo_url) : "";
  const name = typeof settings.website_name === "string" ? settings.website_name.trim() : "";
  if (!logo && !name) return null;
  return (
    <Link href="/" className="flex items-center gap-3" aria-label={name || "Home"}>
      {logo && <Image src={logo} unoptimized alt="" width={48} height={48} priority className="h-11 w-11 object-contain" />}
      {name && <span className={`leading-tight ${inverse ? "text-white" : "text-[var(--color-ink)]"}`}><span className="block text-sm font-bold">{name}</span></span>}
    </Link>
  );
}
