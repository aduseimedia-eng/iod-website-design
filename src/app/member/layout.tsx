import { PortalGuard } from "@/components/auth/PortalGuard";

export default function MemberLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PortalGuard>{children}</PortalGuard>;
}
