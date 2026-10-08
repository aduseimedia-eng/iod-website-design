"use client";

import type { CmsPageDraft } from "@/lib/api/cms";
import { builtInSections } from "@/lib/cms/builtInSections";
import { sectionState, setSectionState } from "@/lib/cms/sectionVisibility";
import { buttonClass, Panel } from "./Fields";

export function BuiltInSections({ path, legacy = true, sections, onChange }: { path: string; legacy?: boolean; sections: CmsPageDraft["sections"]; onChange: (sections: CmsPageDraft["sections"]) => void }) {
  const definitions = builtInSections(path, legacy);
  if (!definitions.length) return null;
  return <Panel title="Built-in page sections" open>
    <p className="text-sm text-[var(--color-slate)]">Hide or remove complete sections, including their headings and backgrounds. Save Changes to update the website. Removed sections retain their content and can be restored here. Custom content must also be enabled in its editor below.</p>
    <div className="divide-y divide-[var(--color-line)]">{definitions.map(({ key, label }) => {
      const state = sectionState({ sections }, key);
      return <div key={key} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <span className="text-sm font-semibold">{label}{state && <span className="ml-2 font-normal text-[var(--color-slate)]">({state})</span>}</span>
        <div className="flex items-center gap-3">
          {state === "removed" ? <button type="button" className={buttonClass} onClick={() => onChange(setSectionState(sections, key))}>Restore section</button> : <>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!state} onChange={(event) => onChange(setSectionState(sections, key, event.target.checked ? undefined : "hidden"))} />Show section<span className="sr-only">: {label}</span></label>
            <button type="button" className="text-sm text-red-700 underline" onClick={() => { if (window.confirm(`Remove ${label} from this page? You can restore it later.`)) onChange(setSectionState(sections, key, "removed")); }}>Remove section<span className="sr-only">: {label}</span></button>
          </>}
        </div>
      </div>;
    })}</div>
  </Panel>;
}
