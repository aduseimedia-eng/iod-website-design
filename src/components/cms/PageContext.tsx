"use client";

import { createContext } from "react";
import { CmsPageRevision } from "@/lib/api/cms";

export const CmsPageContext = createContext<{ slug: string; revision: CmsPageRevision } | null>(null);
