import { PortalGuard } from "@/components/auth/PortalGuard";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PortalGuard admin>{children}</PortalGuard>;
}
