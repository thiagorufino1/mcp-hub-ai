"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

export type GroupRow = {
  id: string;
  entraGroupId: string;
  displayName: string;
};

export async function upsertGroup(formData: FormData): Promise<void> {
  const user = await requireAdmin();

  const entraGroupId = formData.get("entraGroupId") as string;
  const displayName = formData.get("displayName") as string;

  const group = await prisma.entraGroup.upsert({
    where: { entraGroupId },
    create: { entraGroupId, displayName },
    update: { displayName },
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
