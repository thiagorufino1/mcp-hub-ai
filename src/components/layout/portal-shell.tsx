import type { ReactNode } from "react";

import { AdminNavigation } from "@/components/layout/admin-navigation";
import { UserNavigation } from "@/components/layout/user-navigation";
import { PortalHeader } from "@/components/layout/portal-header";

export function PortalShell({ children, isAdmin, section, showAdminNavigation = false, showUserNavigation = false, userName }: {
  children: ReactNode;
  isAdmin: boolean;
  section?: string;
  showAdminNavigation?: boolean;
  showUserNavigation?: boolean;
  userName?: string | null;
}) {
  return (
    <div className="fixed inset-0 flex flex-col bg-[var(--color-bg)]">
      <PortalHeader isAdmin={isAdmin} section={section} userName={userName} />
      <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 gap-5 px-4 py-5 lg:px-6">
        {showAdminNavigation ? <AdminNavigation /> : showUserNavigation ? <UserNavigation isAdmin={isAdmin} /> : null}
        <main className="portal-content min-h-0 min-w-0 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>{children}</main>
      </div>
    </div>
  );
}
