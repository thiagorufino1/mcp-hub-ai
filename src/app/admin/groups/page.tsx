import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { GroupsAdminClient } from "./client";

export const metadata = { title: "Groups — Admin" };

export default async function AdminGroupsPage() {
  await requireAdmin();

  const groups = await prisma.entraGroup.findMany({
    orderBy: [
      { isActive: "desc" },
      { displayName: "asc" },
    ],
    select: {
      id: true,
      entraGroupId: true,
      displayName: true,
      memberCount: true,
      isActive: true,
      lastSyncedAt: true,
    },
  });

  return (
    <GroupsAdminClient
      groups={groups.map((group) => ({
        ...group,
        memberCount: group.memberCount,
        isActive: group.isActive,
        lastSyncedAt: group.lastSyncedAt ? group.lastSyncedAt.toISOString() : null,
      }))}
    />
  );
}
