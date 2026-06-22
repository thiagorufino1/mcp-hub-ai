"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { syncNamespaceToolsForNamespace } from "@/lib/namespace-tool-sync";

export type NamespaceRow = {
  id: string;
  alias: string;
  name: string;
  description: string | null;
  enabled: boolean;
  published: boolean;
  allUsers: boolean;
  groups: Array<{ id: string; displayName: string }>;
  users: Array<{ id: string; name: string | null; email: string | null }>;
  mcpServerIds: string[];
  toolsCount: number;
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
  llmConfig?: {
    displayName: string;
    allowedModels: string[];
  } | null;
  namespace?: {
    id: string;
    name: string;
    alias: string;
    enabled: boolean;
    _count: {
      servers: number;
      tools: number;
    };
  } | null;
};

export async function saveNamespace(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = optionalString(formData, "id");
  const allUsers = formData.get("allUsers") === "true";
  const groupIds = allUsers ? [] : formData.getAll("groupIds").map(String);
  const userIds = allUsers ? [] : formData.getAll("userIds").map(String);
  const mcpServerIds = formData.getAll("mcpServerIds").map(String);
  const name = requiredString(formData, "name");
  const alias = normalizeAlias(requiredString(formData, "alias"));

  const duplicate = await prisma.mcpNamespace.findFirst({
    where: id
      ? {
          id: { not: id },
          OR: [{ alias }, { name }],
        }
      : {
          OR: [{ alias }, { name }],
        },
    select: { name: true, alias: true },
  });
  if (duplicate?.alias === alias) {
    throw new Error(`Namespace alias "${alias}" already exists.`);
  }
  if (duplicate?.name === name) {
    throw new Error(`Namespace name "${name}" already exists.`);
  }

  const data = {
    description: optionalString(formData, "description"),
    enabled: formData.get("enabled") === "true",
    groups: { set: groupIds.map((groupId) => ({ id: groupId })) },
    users: { set: userIds.map((userId) => ({ id: userId })) },
    name,
    published: formData.get("enabled") === "true" && formData.get("published") === "true",
    alias,
  };

  let savedId: string;
  try {
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
          alias: data.alias,
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
  } catch (cause) {
    if (isUniqueConstraintError(cause)) {
      throw new Error("Namespace name or alias already exists.");
    }
    throw cause;
  }
  await syncNamespaceToolsForNamespace(savedId);
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: id ? "workspace.update" : "workspace.create", resource: "McpNamespace", resourceId: savedId, metadata: { name: formData.get("name") as string } });
  revalidatePath(`/admin/namespaces/${savedId}`);
  revalidatePath("/admin/namespaces");
  revalidatePath("/admin/workspaces");
}

export async function setNamespaceEnabled(id: string, enabled: boolean): Promise<void> {
  const user = await requireAdmin();

  const namespace = await prisma.mcpNamespace.findUnique({
    where: { id },
    select: { enabled: true, published: true, name: true },
  });

  if (!namespace) {
    throw new Error("Namespace not found.");
  }

  const nextPublished = enabled ? namespace.published : false;

  await prisma.mcpNamespace.update({
    where: { id },
    data: {
      enabled,
      published: nextPublished,
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "McpNamespace",
    resourceId: id,
    metadata: { enabled, published: nextPublished, name: namespace.name },
  });

  revalidatePath("/admin/namespaces");
  revalidatePath(`/admin/namespaces/${id}`);
  revalidatePath("/admin/workspaces");
}

export async function setNamespacePublished(id: string, published: boolean): Promise<void> {
  const user = await requireAdmin();

  const namespace = await prisma.mcpNamespace.findUnique({
    where: { id },
    select: { enabled: true, published: true, name: true },
  });

  if (!namespace) {
    throw new Error("Namespace not found.");
  }

  if (!namespace.enabled && published) {
    throw new Error("Disabled namespaces cannot be published.");
  }

  await prisma.mcpNamespace.update({
    where: { id },
    data: {
      published: namespace.enabled ? published : false,
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "McpNamespace",
    resourceId: id,
    metadata: { published: namespace.enabled ? published : false, name: namespace.name },
  });

  revalidatePath("/admin/namespaces");
  revalidatePath(`/admin/namespaces/${id}`);
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
  const allUsers = formData.get("allUsers") === "true";
  const skillIds = formData.getAll("skillIds").map(String);
  const groupIds = formData.getAll("groupIds").map(String);
  const userIds = formData.has("userIds") ? formData.getAll("userIds").map(String) : undefined;
  const name = requiredString(formData, "name");
  const slug = normalizeSlug(optionalString(formData, "alias") ?? requiredString(formData, "slug"));

  const duplicate = await prisma.workspace.findFirst({
    where: id
      ? {
          id: { not: id },
          OR: [{ slug }, { name }],
        }
      : {
          OR: [{ slug }, { name }],
        },
    select: { name: true, slug: true },
  });
  if (duplicate?.slug === slug) {
    throw new Error(`Workspace slug "${slug}" already exists.`);
  }
  if (duplicate?.name === name) {
    throw new Error(`Workspace name "${name}" already exists.`);
  }

  const baseData = {
    approvalMode: optionalString(formData, "approvalMode") || "risk_based",
    conversationStarters: lines(formData, "conversationStarters"),
    description: optionalString(formData, "description"),
    enabled: formData.get("enabled") === "true",
    groups: { set: groupIds.map((groupId) => ({ id: groupId })) },
    isDefault,
    llmConfigId: optionalString(formData, "llmConfigId"),
    maxSteps: integerField(formData, "maxSteps", 6, 1, 12),
    model: optionalString(formData, "model"),
    name,
    namespaceId: optionalString(formData, "namespaceId"),
    skills: { set: skillIds.map((skillId) => ({ id: skillId })) },
    slug,
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
      await tx.workspace.update({
        where: { id },
        data: {
          ...baseData,
          ...(allUsers ? {} : userIds ? { users: { set: userIds.map((userId) => ({ id: userId })) } } : {}),
        },
      });
      return id;
    } else {
      const ws = await tx.workspace.create({
        data: {
          ...baseData,
          groups: { connect: groupIds.map((groupId) => ({ id: groupId })) },
          skills: { connect: skillIds.map((skillId) => ({ id: skillId })) },
          ...(allUsers || !userIds ? {} : { users: { connect: userIds.map((userId) => ({ id: userId })) } }),
        },
      });
      return ws.id;
    }
  });
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: id ? "workspace.update" : "workspace.create", resource: "Workspace", resourceId: savedId, metadata: { name } });
  revalidatePath("/admin/workspaces");
  revalidatePath(`/admin/workspaces/${savedId}`);
}

export async function deleteWorkspace(id: string): Promise<void> {
  const user = await requireAdmin();
  await prisma.workspace.delete({ where: { id } });
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "workspace.delete", resource: "Workspace", resourceId: id });
  revalidatePath("/admin/workspaces");
}

export async function updateWorkspaceFlags(
  id: string,
  values: { enabled: boolean; isDefault: boolean },
): Promise<void> {
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
      data: {
        enabled: values.enabled,
        isDefault: values.enabled ? values.isDefault : false,
      },
    });
  });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "workspace.update",
    resource: "Workspace",
    resourceId: id,
    metadata: { operation: "flags", ...values },
  });
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

function normalizeAlias(value: string) {
  const alias = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!alias) throw new Error("A valid alias is required.");
  return alias.slice(0, 80);
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

function isUniqueConstraintError(cause: unknown) {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code?: string }).code === "P2002"
  );
}
