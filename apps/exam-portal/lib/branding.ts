import { apiBase } from "./api";

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

export async function getNavbarLogo(): Promise<string | null> {
  try {
    const response = await fetch(`${apiBase}/api/v2/cms/site/`, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json() as { settings?: { logo_url?: unknown } };
    return trustedLogoUrl(payload.settings?.logo_url);
  } catch {
    return null;
  }
}
