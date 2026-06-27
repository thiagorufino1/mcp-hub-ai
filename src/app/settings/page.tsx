import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { SettingsClient } from "./client";
import { PortalShell } from "@/components/layout/portal-shell";

export const metadata = { title: "Settings — MCP Hub" };

export default async function SettingsPage() {
  const user = await requireAuth();

  const tokens = await prisma.personalToken.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, lastUsedAt: true, createdAt: true },
  });

  return (
    <PortalShell isAdmin={user.isAdmin} section="Settings" showUserNavigation userName={user.name}>
      <SettingsClient tokens={tokens} />
    </PortalShell>
  );
}
