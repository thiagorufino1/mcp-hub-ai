"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { syncEntraGroup } from "@/lib/entra-graph";

export type GroupRow = {
  id: string;
  entraGroupId: string;
  displayName: string;
  memberCount: number;
  isActive: boolean;
  lastSyncedAt: string | null;
};

export async function upsertGroup(formData: FormData): Promise<void> {
  const user = await requireAdmin();

  const entraGroupId = requiredString(formData, "entraGroupId");
  const displayName = requiredString(formData, "displayName");
  const syncResult = await syncEntraGroup(entraGroupId);

  const group = await prisma.entraGroup.upsert({
    where: { entraGroupId },
    create: {
      entraGroupId,
      displayName: syncResult.displayName ?? displayName,
      memberCount: syncResult.memberCount,
      isActive: syncResult.exists,
      lastSyncedAt: new Date(),
    },
    update: {
      displayName: syncResult.displayName ?? displayName,
      memberCount: syncResult.memberCount,
      isActive: syncResult.exists,
      lastSyncedAt: new Date(),
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "group.upsert",
    resource: "EntraGroup",
    resourceId: group.id,
    metadata: { entraGroupId, displayName },
  });

  revalidatePath("/admin/groups");
}

export async function syncAllGroups(): Promise<void> {
  const user = await requireAdmin();

  const groups = await prisma.entraGroup.findMany({
    select: { id: true, entraGroupId: true },
  });

  let activeCount = 0;
  let inactiveCount = 0;

  for (const group of groups) {
    const syncResult = await syncEntraGroup(group.entraGroupId);
    await prisma.entraGroup.update({
      where: { id: group.id },
      data: {
        displayName: syncResult.displayName ?? undefined,
        memberCount: syncResult.memberCount,
        isActive: syncResult.exists,
        lastSyncedAt: new Date(),
      },
    });

    if (syncResult.exists) {
      activeCount += 1;
    } else {
      inactiveCount += 1;
    }
  }

  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "group.sync",
    resource: "EntraGroup",
    metadata: {
      totalGroups: groups.length,
      activeCount,
      inactiveCount,
    },
  });

  revalidatePath("/admin/groups");
}

export async function deleteGroup(id: string): Promise<void> {
  const user = await requireAdmin();
  await prisma.entraGroup.delete({ where: { id } });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "group.delete",
    resource: "EntraGroup",
    resourceId: id,
  });
  revalidatePath("/admin/groups");
}

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} é obrigatório.`);
  return value;
}
