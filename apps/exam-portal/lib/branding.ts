import { apiBase } from "./api";

type PublicSiteSettings = {
  settings?: {
    logo_url?: unknown;
    website_name?: unknown;
  };
};

export type PortalBrand = {
  logoUrl: string | null;
  name: string;
};

const defaultBrand: PortalBrand = {
  logoUrl: null,
  name: "Institute of Directors-Ghana",
};

function trustedLogoUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const apiOrigin = new URL(apiBase).origin;
    const candidate = new URL(value, apiBase);
    return candidate.origin === apiOrigin && ["http:", "https:"].includes(candidate.protocol) ? candidate.toString() : null;
  } catch {
    return null;
  }
}

export async function getPortalBrand(): Promise<PortalBrand> {
  try {
    const response = await fetch(`${apiBase}/api/v2/cms/site/`, { cache: "no-store" });
    if (!response.ok) return defaultBrand;
    const payload = await response.json() as PublicSiteSettings;
    const name = typeof payload.settings?.website_name === "string" && payload.settings.website_name.trim()
      ? payload.settings.website_name.trim()
      : defaultBrand.name;
    return { name, logoUrl: trustedLogoUrl(payload.settings?.logo_url) };
  } catch {
    return defaultBrand;
  }
}
