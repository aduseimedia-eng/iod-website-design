"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { apiBaseUrl } from "@/lib/api/client";

const excludedPaths = ["/admin", "/member", "/api", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/cms-preview"];

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || excludedPaths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return;
    void fetch(`${apiBaseUrl}/api/v1/analytics/visits/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
