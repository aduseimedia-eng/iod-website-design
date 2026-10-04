"use client";

import Image from "next/image";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { getPublishedCmsPage } from "@/lib/api/cms";

type ProfileEntry = { id: string; key: string; url: string; alt: string; displayName: string; role: string; summary: string; biography: string };
type ProfileGallery = { entries: ProfileEntry[]; byKey: Record<string, ProfileEntry> };

const ProfilePhotosContext = createContext<ProfileGallery>({ entries: [], byKey: {} });
const isImageUrl = (value: string) => /^(https?:\/\/|\/(?!\/))/i.test(value.trim());

function profileGalleryFromPage(page: Awaited<ReturnType<typeof getPublishedCmsPage>>): ProfileGallery {
  const entries = page.revision.sections
    .filter((section) => section.section_type === "profile_gallery" && section.is_enabled && Array.isArray(section.data.items))
    .flatMap((section) => (section.data.items as unknown[]).map((item, index) => ({ item, sectionId: section.id || "profiles", index })))
    .flatMap(({ item, sectionId, index }) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const entry = item as Record<string, unknown>;
      const key = typeof entry.title === "string" ? entry.title.trim() : "";
      const url = typeof entry.image_url === "string" ? entry.image_url.trim() : "";
      const metadata = entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata) ? entry.metadata as Record<string, unknown> : {};
      const alt = typeof metadata.alt_text === "string" ? metadata.alt_text.trim() : "";
      if (!key) return [];
      return [{ id: typeof entry.id === "string" ? entry.id : `${sectionId}-${index}`, key, url: isImageUrl(url) ? url : "", alt, displayName: typeof metadata.display_name === "string" ? metadata.display_name.trim() : "", role: typeof metadata.role === "string" ? metadata.role.trim() : "", summary: typeof metadata.summary === "string" ? metadata.summary.trim() : "", biography: typeof metadata.biography === "string" ? metadata.biography.trim() : "" }];
    });
  return { entries, byKey: Object.fromEntries(entries.filter((entry) => entry.url).map((entry) => [entry.key, entry])) };
}

export function ProfilePhotosProvider({ pageSlug, children }: { pageSlug: string; children: ReactNode }) {
  const [gallery, setGallery] = useState<ProfileGallery>({ entries: [], byKey: {} });

  useEffect(() => {
    let active = true;
    getPublishedCmsPage(pageSlug)
      .then((page) => { if (active) setGallery(profileGalleryFromPage(page)); })
      .catch(() => { if (active) setGallery({ entries: [], byKey: {} }); });
    return () => { active = false; };
  }, [pageSlug]);

  return <ProfilePhotosContext.Provider value={gallery}>{children}</ProfilePhotosContext.Provider>;
}

export function ProfilePhoto({ profileKey, alt, className, children }: { profileKey: string | string[]; alt: string; className: string; children: ReactNode }) {
  const { byKey } = useContext(ProfilePhotosContext);
  const photo = (Array.isArray(profileKey) ? profileKey : [profileKey]).map((key) => byKey[key]).find(Boolean);
  if (!photo) return <>{children}</>;
  return <Image src={photo.url} alt={photo.alt || alt} width={152} height={190} unoptimized className={className} />;
}

export function useProfileGallery() {
  return useContext(ProfilePhotosContext).entries;
}
