"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

function revalidateWorkspace(id: string) {
  revalidatePath(`/admin/workspaces/${id}`);
  revalidatePath("/admin/workspaces");
}

export async function updateWorkspaceBasics(
  id: string,
  values: { name: string; slug: string; description: string | null },
) {
  const user = await requireAdmin();
  const name = values.name.trim();
  const slug = normalizeSlug(values.slug);
  if (!name) throw new Error("Workspace name is required.");

  const duplicate = await prisma.workspace.findFirst({
    where: { id: { not: id }, OR: [{ name }, { slug }] },
    select: { name: true, slug: true },
  });
  if (duplicate?.name === name) throw new Error(`Workspace name "${name}" already exists.`);
  if (duplicate?.slug === slug) throw new Error(`Workspace alias "${slug}" already exists.`);

  await prisma.workspace.update({
    where: { id },
    data: { name, slug, description: values.description?.trim() || null },
  });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "Workspace",
    resourceId: id,
    metadata: { name, slug },
  });
  revalidateWorkspace(id);
}

export async function deleteWorkspace(id: string) {
  const user = await requireAdmin();
  await prisma.workspace.delete({ where: { id } });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.delete",
    resource: "Workspace",
    resourceId: id,
  });
  revalidatePath("/admin/workspaces");
}

export async function updateWorkspaceLlm(
  id: string,
  values: {
    llmConfigId: string | null;
  },
) {
  const user = await requireAdmin();
  await prisma.workspace.update({
    where: { id },
    data: {
      llmConfigId: values.llmConfigId || null,
    },
  });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "Workspace",
    resourceId: id,
    metadata: { operation: "llm" },
  });
  revalidateWorkspace(id);
}

export async function updateWorkspaceSystemPrompt(id: string, systemPrompt: string | null) {
  const user = await requireAdmin();
  await prisma.workspace.update({
    where: { id },
    data: { systemPrompt: systemPrompt?.trim() || null },
  });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "Workspace",
    resourceId: id,
    metadata: { operation: "systemPrompt" },
  });
  revalidateWorkspace(id);
}

export async function updateWorkspaceNamespace(id: string, namespaceId: string | null) {
  const user = await requireAdmin();
  await prisma.workspace.update({
    where: { id },
    data: { namespaceId: namespaceId || null },
  });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "Workspace",
    resourceId: id,
    metadata: { operation: "namespace", namespaceId },
  });
  revalidateWorkspace(id);
}

export async function addWorkspaceSkill(workspaceId: string, skillId: string) {
  const user = await requireAdmin();
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { skills: { connect: { id: skillId } } },
  });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "Workspace",
    resourceId: workspaceId,
    metadata: { operation: "skill.add", skillId },
  });
  revalidateWorkspace(workspaceId);
}

export async function deleteWorkspaceSkill(workspaceId: string, skillId: string) {
  const user = await requireAdmin();
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { skills: { disconnect: { id: skillId } } },
  });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "Workspace",
    resourceId: workspaceId,
    metadata: { operation: "skill.remove", skillId },
  });
  revalidateWorkspace(workspaceId);
}

export async function addWorkspaceGroup(workspaceId: string, groupId: string) {
  const user = await requireAdmin();
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { groups: { connect: { id: groupId } } },
  });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "Workspace",
    resourceId: workspaceId,
    metadata: { operation: "group.add", groupId },
  });
  revalidateWorkspace(workspaceId);
}

export async function deleteWorkspaceGroup(workspaceId: string, groupId: string) {
  const user = await requireAdmin();
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { groups: { disconnect: { id: groupId } } },
  });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "Workspace",
    resourceId: workspaceId,
    metadata: { operation: "group.remove", groupId },
  });
  revalidateWorkspace(workspaceId);
}

export async function setWorkspaceAllUsers(workspaceId: string, allUsers: boolean) {
  const user = await requireAdmin();
  if (!allUsers) return;
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { groups: { set: [] }, users: { set: [] } },
  });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "Workspace",
    resourceId: workspaceId,
    metadata: { operation: "access", allUsers: true },
  });
  revalidateWorkspace(workspaceId);
}

export async function updateWorkspaceSettings(
  id: string,
  values: { enabled: boolean; isDefault: boolean },
) {
  const user = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    if (values.isDefault) {
      await tx.workspace.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }
    await tx.workspace.update({
      where: { id },
      data: { enabled: values.enabled, isDefault: values.isDefault },
    });
  });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "Workspace",
    resourceId: id,
    metadata: { operation: "settings", ...values },
  });
  revalidateWorkspace(id);
}

function normalizeSlug(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("A valid workspace alias is required.");
  return slug.slice(0, 80);
}
