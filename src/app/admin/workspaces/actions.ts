"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export type NamespaceRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  enabled: boolean;
  published: boolean;
  allUsers: boolean;
  groups: Array<{ id: string; displayName: string }>;
  users: Array<{ id: string; name: string | null; email: string | null }>;
  mcpServerIds: string[];
};

export type WorkspaceRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  systemPrompt: string | null;
  model: string | null;
  maxSteps: number;
  approvalMode: string;
  conversationStarters: string[];
  enabled: boolean;
  isDefault: boolean;
  llmConfigId: string | null;
  namespaceId: string | null;
  skills: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; displayName: string }>;
  users: Array<{ id: string; name: string | null; email: string | null }>;
};

export async function saveNamespace(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = optionalString(formData, "id");
  const allUsers = formData.get("allUsers") === "true";
  const groupIds = allUsers ? [] : formData.getAll("groupIds").map(String);
  const userIds = allUsers ? [] : formData.getAll("userIds").map(String);
  const mcpServerIds = formData.getAll("mcpServerIds").map(String);

  const data = {
    description: optionalString(formData, "description"),
    enabled: formData.get("enabled") === "true",
    groups: { set: groupIds.map((groupId) => ({ id: groupId })) },
    users: { set: userIds.map((userId) => ({ id: userId })) },
    name: requiredString(formData, "name"),
    published: formData.get("published") === "true",
    slug: normalizeSlug(requiredString(formData, "slug")),
  };

  let savedId: string;
  if (id) {
    const ns = await prisma.mcpNamespace.update({
      where: { id },
      data: {
        ...data,
        servers: {
          deleteMany: {},
          create: mcpServerIds.map((mcpServerId, displayOrder) => ({
            displayOrder,
            mcpServerId,
          })),
        },
      },
    });
    savedId = ns.id;
  } else {
    const ns = await prisma.mcpNamespace.create({
      data: {
        description: data.description,
        enabled: data.enabled,
        groups: { connect: groupIds.map((groupId) => ({ id: groupId })) },
        name: data.name,
        published: data.published,
        slug: data.slug,
        users: { connect: userIds.map((userId) => ({ id: userId })) },
        servers: {
          create: mcpServerIds.map((mcpServerId, displayOrder) => ({
            displayOrder,
            mcpServerId,
          })),
        },
      },
    });
    savedId = ns.id;
  }
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: id ? "workspace.update" : "workspace.create", resource: "McpNamespace", resourceId: savedId, metadata: { name: formData.get("name") as string } });
  revalidatePath("/admin/workspaces");
}

export async function deleteNamespace(id: string): Promise<void> {
  const user = await requireAdmin();
  await prisma.mcpNamespace.delete({ where: { id } });
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "workspace.delete", resource: "McpNamespace", resourceId: id });
  revalidatePath("/admin/workspaces");
}

export async function saveWorkspace(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = optionalString(formData, "id");
  const isDefault = formData.get("isDefault") === "true";
  const skillIds = formData.getAll("skillIds").map(String);
  const groupIds = formData.getAll("groupIds").map(String);
  const userIds = formData.getAll("userIds").map(String);
  const data = {
    approvalMode: optionalString(formData, "approvalMode") || "risk_based",
    conversationStarters: lines(formData, "conversationStarters"),
    description: optionalString(formData, "description"),
    enabled: formData.get("enabled") === "true",
    groups: { set: groupIds.map((groupId) => ({ id: groupId })) },
    users: { set: userIds.map((userId) => ({ id: userId })) },
    isDefault,
    llmConfigId: optionalString(formData, "llmConfigId"),
    maxSteps: integerField(formData, "maxSteps", 6, 1, 12),
    model: optionalString(formData, "model"),
    name: requiredString(formData, "name"),
    namespaceId: optionalString(formData, "namespaceId"),
    skills: { set: skillIds.map((skillId) => ({ id: skillId })) },
    slug: normalizeSlug(requiredString(formData, "slug")),
    systemPrompt: optionalString(formData, "systemPrompt"),
  };

  const savedId = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.workspace.updateMany({
        where: id ? { id: { not: id } } : undefined,
        data: { isDefault: false },
      });
    }
    if (id) {
      await tx.workspace.update({ where: { id }, data });
      return id;
    } else {
      const ws = await tx.workspace.create({
        data: {
          ...data,
          groups: { connect: groupIds.map((groupId) => ({ id: groupId })) },
          skills: { connect: skillIds.map((skillId) => ({ id: skillId })) },
          users: { connect: userIds.map((userId) => ({ id: userId })) },
        },
      });
      return ws.id;
    }
  });
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: id ? "workspace.update" : "workspace.create", resource: "Workspace", resourceId: savedId, metadata: { name: formData.get("name") as string } });
  revalidatePath("/admin/workspaces");
}

export async function deleteWorkspace(id: string): Promise<void> {
  const user = await requireAdmin();
  await prisma.workspace.delete({ where: { id } });
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "workspace.delete", resource: "Workspace", resourceId: id });
  revalidatePath("/admin/workspaces");
}

function requiredString(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function lines(formData: FormData, key: string) {
  return String(formData.get(key) ?? "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function integerField(
  formData: FormData,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const value = Number(formData.get(key));
  return Number.isInteger(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

function normalizeSlug(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("A valid slug is required.");
  return slug.slice(0, 80);
}

function normalizeToolAlias(value: string) {
  const alias = value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!alias) throw new Error("Every selected tool requires a valid alias.");
  return alias.slice(0, 64);
}
