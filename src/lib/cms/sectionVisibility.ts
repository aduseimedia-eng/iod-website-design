import type { CmsPageDraft } from "@/lib/api/cms";

type SectionState = "hidden" | "removed";
export const layoutSlot = "page_layout";

export function sectionState(revision: { sections: { slot: string; data: Record<string, unknown> }[] }, key: string): SectionState | undefined {
  const states = revision.sections.find((section) => section.slot === layoutSlot)?.data.visibility;
  if (!states || typeof states !== "object" || Array.isArray(states)) return undefined;
  const state = (states as Record<string, unknown>)[key];
  return state === "hidden" || state === "removed" ? state : undefined;
}

export function setSectionState(sections: CmsPageDraft["sections"], key: string, state?: SectionState) {
  const current = sections.find((section) => section.slot === layoutSlot);
  const visibility = { ...(current?.data.visibility as Record<string, unknown> | undefined), [key]: state ?? "visible" };
  const updated = { slot: layoutSlot, section_type: "rich_text", position: sections.length, primary_media: null, is_enabled: true, ...current, data: { ...current?.data, visibility } };
  return current ? sections.map((section) => section === current ? updated : section) : [...sections, updated];
}

// Replace an editor group once, without duplicating it or discarding other groups.
// Existing group positions are reused so editing a panel preserves page order.
export function replaceSectionGroup<T>(all: T[], group: T[], replacement: T[]): T[] {
  const selected = new Set(group);
  const result: T[] = [];
  let next = 0;
  let lastPosition = -1;
  for (const section of all) {
    if (!selected.has(section)) { result.push(section); continue; }
    if (next < replacement.length) result.push(replacement[next++]);
    lastPosition = result.length;
  }
  result.splice(lastPosition < 0 ? result.length : lastPosition, 0, ...replacement.slice(next));
  return result;
}
