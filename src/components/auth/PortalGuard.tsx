"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { canAccessAdmin, CurrentUser, getCurrentUser } from "@/lib/api/auth";

type PortalGuardProps = { children: React.ReactNode; admin?: boolean };
const CurrentUserContext = createContext<CurrentUser | null>(null);

export function useCurrentUser() {
  const user = useContext(CurrentUserContext);
  if (!user) throw new Error("useCurrentUser must be used inside PortalGuard.");
  return user;
}

export function PortalGuard({ children, admin = false }: PortalGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then((currentUser) => {
      if (admin && !canAccessAdmin(currentUser)) router.replace("/member/dashboard");
      else setUser(currentUser);
    }).catch(() => router.replace(`/login?next=${encodeURIComponent(pathname)}`)).finally(() => setLoading(false));
  }, [admin, pathname, router]);

  if (loading || !user) return <main className="grid min-h-[50vh] place-items-center bg-[var(--color-warm-white)]"><p className="text-sm font-bold text-[var(--color-slate)]">Loading your account…</p></main>;
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}
