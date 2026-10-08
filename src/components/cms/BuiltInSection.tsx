"use client";

import { ComponentProps, ReactNode, useContext } from "react";
import { CmsPageContext } from "./PageContext";
import { sectionState } from "@/lib/cms/sectionVisibility";

export function BuiltInVisibility({ sectionId, sectionType, children }: { sectionId: string; sectionType?: string; children: ReactNode }) {
  const context = useContext(CmsPageContext);
  if (context && (sectionState(context.revision, sectionId) || (sectionType && !context.revision.sections.some((section) => section.section_type === sectionType && section.is_enabled)))) return null;
  return <>{children}</>;
}

export function BuiltInSection({ sectionId, sectionType, children, ...props }: ComponentProps<"section"> & { sectionId: string; sectionType?: string }) {
  return <BuiltInVisibility sectionId={sectionId} sectionType={sectionType}><section {...props}>{children}</section></BuiltInVisibility>;
}
