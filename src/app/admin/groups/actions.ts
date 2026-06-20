"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export type GroupRow = {
  id: string;
  entraGroupId: string;
  displayName: string;
  policy: {
    id: string;
    allowedModels: string[];
    mcpServers: { id: string; name: string }[];
    skills: { id: string; name: string }[];
  } | null;
};

export async function upsertGroup(formData: FormData): Promise<void> {
  await requireAdmin();

  const entraGroupId = formData.get("entraGroupId") as string;
  const displayName = formData.get("displayName") as string;
  const mcpServerIds = formData.getAll("mcpServerIds") as string[];
  const skillIds = formData.getAll("skillIds") as string[];
  const modelsRaw = (formData.get("allowedModels") as string | null) ?? "";
  const allowedModels = modelsRaw.split("\n").map((m) => m.trim()).filter(Boolean);

  const group = await prisma.entraGroup.upsert({
    where: { entraGroupId },
    create: { entraGroupId, displayName },
    update: { displayName },
  });

  await prisma.accessPolicy.upsert({
    where: { groupId: group.id },
    create: {
      groupId: group.id,
      allowedModels,
      mcpServers: { connect: mcpServerIds.map((id) => ({ id })) },
      skills: { connect: skillIds.map((id) => ({ id })) },
    },
    update: {
      allowedModels,
      mcpServers: { set: mcpServerIds.map((id) => ({ id })) },
      skills: { set: skillIds.map((id) => ({ id })) },
    },
  });

  revalidatePath("/admin/groups");
}

export async function deleteGroup(id: string): Promise<void> {
  await requireAdmin();
  await prisma.entraGroup.delete({ where: { id } });
  revalidatePath("/admin/groups");
}
