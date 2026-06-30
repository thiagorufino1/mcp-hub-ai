import { requireAdmin } from "@/lib/auth-helpers";
import { PortalShell } from "@/components/layout/portal-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <PortalShell isAdmin showAdminNavigation userName={user.name} userImage={user.image ?? null}>
      {children}
    </PortalShell>
  );
}
