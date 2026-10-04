"use client";

import { useSiteSettings } from "@/components/cms/SiteSettings";

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function HomepageWhatsApp() {
  const settings = useSiteSettings();
  const number = textValue(settings.whatsapp_number).replace(/\D/g, "");
  const message = textValue(settings.whatsapp_message);
  if (number.length < 8) return null;
  const href = `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  return <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Ask us a question on WhatsApp" title="Ask us on WhatsApp" className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:bg-[#1ebe5d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#25D366] sm:bottom-7 sm:right-7" >
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-6 w-6 fill-current"><path d="M16 3.2a12.7 12.7 0 0 0-10.9 19.2L3.5 28.8l6.6-1.7A12.8 12.8 0 1 0 16 3.2Zm0 23.2c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.4 10.4 0 1 1 16 26.4Zm5.7-7.8c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2s-.8 1-.9 1.2c-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.8-1.7.1-.2 0-.5-.1-.7-.1-.2-.7-1.6-.9-2.1-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.6.1-.9.5-.3.4-1.2 1.2-1.2 3s1.2 3.5 1.4 3.8c.2.2 2.4 3.8 5.9 5.3 2.2 1 3 1.1 4.1.9.7-.1 1.8-.7 2.1-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.2-.6-.4Z" /></svg>
    <span className="sr-only">Ask us on WhatsApp</span>
  </a>;
}
