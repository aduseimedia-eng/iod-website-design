"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiBaseUrl } from "@/lib/api/client";
import { CmsPageRevision } from "@/lib/api/cms";
import { CmsRevisionRenderer } from "./CmsPublishedRoute";

type PreviewPage = { id: string; path: string; slug: string; template_key: string; revision: CmsPageRevision };

export function CmsPreviewPage() {
  const params = useSearchParams();
  const revisionId = params.get("revision");
  const token = params.get("token");
  const [page, setPage] = useState<PreviewPage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!revisionId || !token) return;
    void fetch(`${apiBaseUrl}/api/v2/cms/pages/preview/${encodeURIComponent(revisionId)}/?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<PreviewPage> : Promise.reject(new Error("This preview link has expired or is invalid.")))
      .then(setPage)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "We could not load this preview."));
  }, [revisionId, token]);

  if (!revisionId || !token) return <main className="grid min-h-screen place-items-center bg-[var(--color-warm-white)] p-8"><p className="border-l-2 border-[var(--color-error)] bg-red-50 p-5 text-sm">This preview link is incomplete.</p></main>;
  if (error) return <main className="grid min-h-screen place-items-center bg-[var(--color-warm-white)] p-8"><p className="border-l-2 border-[var(--color-error)] bg-red-50 p-5 text-sm">{error}</p></main>;
  if (!page) return <main className="grid min-h-screen place-items-center bg-[var(--color-warm-white)]"><p className="text-sm font-bold text-[var(--color-slate)]">Loading preview…</p></main>;
  return <><div className="bg-amber-100 p-3 text-center text-sm">Private preview</div><CmsRevisionRenderer revision={page.revision} templateKey={page.template_key} /></>;
}
