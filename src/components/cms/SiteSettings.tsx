"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/api/client";
import { linkUrl } from "./ContentRenderer";

const SettingsContext = createContext<Record<string, unknown>>({});
export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Record<string, unknown>>({});
  useEffect(() => {
    let controller: AbortController;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      fetch(apiBaseUrl + "/api/v2/cms/site/", { signal, cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((result) => { if (result && !signal.aborted) setData(result.settings); }).catch(() => {});
    };
    refresh();
    window.addEventListener("cms:settings-published", refresh);
    window.addEventListener("focus", refresh);
    return () => { controller?.abort(); window.removeEventListener("cms:settings-published", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  return <SettingsContext.Provider value={data}>{children}</SettingsContext.Provider>;
}
export function useSiteSettings() { return useContext(SettingsContext); }

const socialNetworks = ["Facebook", "Instagram", "LinkedIn", "X", "YouTube"] as const;
type SocialNetwork = typeof socialNetworks[number];

function SocialIcon({ name }: { name: SocialNetwork }) {
  if (name === "Facebook") return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><path d="M13.8 21v-8h2.7l.4-3h-3.1V8.1c0-.9.2-1.5 1.5-1.5H17V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V10H8v3h2.7v8h3.1Z" /></svg>;
  if (name === "Instagram") return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[2]"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" className="fill-current stroke-none" /></svg>;
  if (name === "LinkedIn") return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><path d="M5.3 3.5A1.8 1.8 0 1 1 5.3 7a1.8 1.8 0 0 1 0-3.5ZM3.8 8.4h3v12.1h-3V8.4Zm4.9 0h2.9V10h.1c.4-.8 1.4-1.9 3.2-1.9 3.4 0 4 2.2 4 5.2v7.2h-3v-6.4c0-1.5 0-3.5-2.1-3.5s-2.5 1.7-2.5 3.4v6.5h-3V8.4Z" /></svg>;
  if (name === "X") return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><path d="M18.9 3h2.9l-6.3 7.2 7.4 10.8h-5.8l-4.5-6.4L7 21H4.1l6.7-7.6L3.7 3h5.9l4.1 5.8L18.9 3Zm-1 16.3h1.6L8.7 4.6H7l10.9 14.7Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1C2 9 2 12 2 12s0 3 .4 4.8a3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1c.4-1.8.4-4.8.4-4.8s0-3-.4-4.8ZM10.1 15V9l5.2 3-5.2 3Z" /></svg>;
}

export function SiteContact({ settings, showContact = true, showSocial = true }: { settings?: Record<string, unknown>; showContact?: boolean; showSocial?: boolean } = {}) {
  const shared = useSiteSettings();
  const data = settings || shared;
  const text = (key: string) => typeof data[key] === "string" ? data[key] as string : "";
  const phones = Array.from(new Set([text("phone"), ...(Array.isArray(data.phone_numbers) ? data.phone_numbers.filter((value): value is string => typeof value === "string") : [])].map((value) => value.trim()).filter(Boolean)));
  if (!showContact && !showSocial) return null;
  return <div className="mt-5 space-y-2 text-sm">{showContact && <>{text("contact_email") && <p><a href={"mailto:" + text("contact_email")}>{text("contact_email")}</a></p>}{phones.map((phone) => <p key={phone}><a href={"tel:" + phone}>{phone}</a></p>)}{text("address") && <p className="whitespace-pre-line">{text("address")}</p>}</>}{showSocial && <div className="flex flex-wrap gap-2 pt-2">{socialNetworks.map((name) => linkUrl(text(name.toLowerCase())) && <a key={name} href={linkUrl(text(name.toLowerCase()))} target="_blank" rel="noreferrer" aria-label={name} className="grid h-9 w-9 place-items-center rounded-full border border-white/30 text-[var(--color-gold-light)] transition hover:border-[var(--color-gold-light)] hover:bg-white hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><SocialIcon name={name} /></a>)}</div>}</div>;
}
