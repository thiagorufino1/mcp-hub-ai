import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { GroupsAdminClient } from "./client";

export const metadata = { title: "Entra Groups — Admin" };

export default async function AdminGroupsPage() {
  await requireAdmin();

  const groups = await prisma.entraGroup.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, entraGroupId: true, displayName: true },
  });

  return <GroupsAdminClient groups={groups} />;
}
