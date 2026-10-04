import { Suspense } from "react";

import { CmsPreviewPage } from "@/components/cms/CmsPreviewPage";
export const metadata = { robots: { index: false, follow: false } };

export default function PreviewPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[var(--color-warm-white)]"><p className="text-sm font-bold text-[var(--color-slate)]">Loading preview…</p></main>}><CmsPreviewPage /></Suspense>;
}
