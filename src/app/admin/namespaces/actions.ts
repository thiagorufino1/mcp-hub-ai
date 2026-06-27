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
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: id ? "namespace.update" : "namespace.create", resource: "McpNamespace", resourceId: savedId, metadata: { name: formData.get("name") as string } });
  revalidatePath(`/admin/namespaces/${savedId}`);
  revalidatePath("/admin/namespaces");
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
    action: "namespace.update",
    resource: "McpNamespace",
    resourceId: id,
    metadata: { enabled, published: nextPublished, name: namespace.name },
  });

  revalidatePath("/admin/namespaces");
  revalidatePath(`/admin/namespaces/${id}`);
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
    action: "namespace.update",
    resource: "McpNamespace",
    resourceId: id,
    metadata: { published: namespace.enabled ? published : false, name: namespace.name },
  });

  revalidatePath("/admin/namespaces");
  revalidatePath(`/admin/namespaces/${id}`);
}

export async function deleteNamespace(id: string): Promise<void> {
  const user = await requireAdmin();
  await prisma.mcpNamespace.delete({ where: { id } });
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "namespace.delete", resource: "McpNamespace", resourceId: id });
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

function normalizeAlias(value: string) {
  const alias = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!alias) throw new Error("A valid alias is required.");
  return alias.slice(0, 80);
}

function isUniqueConstraintError(cause: unknown) {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code?: string }).code === "P2002"
  );
}
