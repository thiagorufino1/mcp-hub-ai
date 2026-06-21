import type { ReactNode } from "react";

import { AdminNavigation } from "@/components/layout/admin-navigation";
import { PortalHeader } from "@/components/layout/portal-header";

export function PortalShell({ children, isAdmin, section, showAdminNavigation = false, userName }: {
  children: ReactNode;
  isAdmin: boolean;
  section?: string;
  showAdminNavigation?: boolean;
  userName?: string | null;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PortalHeader isAdmin={isAdmin} section={section} userName={userName} />
      <div className="mx-auto flex w-full max-w-[1500px] gap-5 px-4 py-5 lg:px-6">
        {showAdminNavigation ? <AdminNavigation /> : null}
        <main className="portal-content min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
