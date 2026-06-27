"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { syncNamespaceToolsForNamespace } from "@/lib/namespace-tool-sync";

export async function setNamespaceMcpEnabled(
  namespaceId: string,
  mcpServerId: string,
  enabled: boolean,
): Promise<void> {
  const user = await requireAdmin();
  const result = await prisma.namespaceMcpServer.updateMany({
    where: { namespaceId, mcpServerId },
    data: { enabled },
  });

  if (result.count === 0) {
    throw new Error("MCP server is not assigned to this namespace.");
  }

  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: enabled ? "mcp.enable" : "mcp.disable",
    resource: "NamespaceMcpServer",
    resourceId: `${namespaceId}:${mcpServerId}`,
    metadata: { enabled, mcpServerId, namespaceId },
  });
  await syncNamespaceToolsForNamespace(namespaceId);
  revalidatePath(`/admin/namespaces/${namespaceId}`);
  revalidatePath("/admin/namespaces");
}

export async function addNamespaceMcpServer(
  namespaceId: string,
  mcpServerId: string,
): Promise<void> {
  const user = await requireAdmin();
  const namespace = await prisma.mcpNamespace.findUnique({
    where: { id: namespaceId },
    select: {
      servers: {
        select: { displayOrder: true, mcpServerId: true },
      },
    },
  });

  if (!namespace) {
    throw new Error("Namespace not found.");
  }

  const existing = namespace.servers.find((entry) => entry.mcpServerId === mcpServerId);
  if (existing) {
    await prisma.namespaceMcpServer.updateMany({
      where: { namespaceId, mcpServerId },
      data: { enabled: true },
    });
  } else {
    const nextDisplayOrder =
      namespace.servers.reduce((max, entry) => Math.max(max, entry.displayOrder), -1) + 1;
    await prisma.namespaceMcpServer.create({
      data: {
        namespaceId,
        mcpServerId,
        displayOrder: nextDisplayOrder,
        enabled: true,
      },
    });
  }

  await syncNamespaceToolsForNamespace(namespaceId);
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "namespace.mcp.add",
    resource: "NamespaceMcpServer",
    resourceId: `${namespaceId}:${mcpServerId}`,
    metadata: { namespaceId, mcpServerId },
  });
  revalidatePath(`/admin/namespaces/${namespaceId}`);
  revalidatePath("/admin/namespaces");
}

export async function deleteNamespaceMcpServer(
  namespaceId: string,
  mcpServerId: string,
): Promise<void> {
  const user = await requireAdmin();
  const result = await prisma.namespaceMcpServer.deleteMany({
    where: { namespaceId, mcpServerId },
  });

  if (result.count === 0) {
    throw new Error("MCP server is not assigned to this namespace.");
  }

  await syncNamespaceToolsForNamespace(namespaceId);
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "namespace.mcp.remove",
    resource: "NamespaceMcpServer",
    resourceId: `${namespaceId}:${mcpServerId}`,
    metadata: { namespaceId, mcpServerId },
  });
  revalidatePath(`/admin/namespaces/${namespaceId}`);
  revalidatePath("/admin/namespaces");
}

export async function addNamespaceGroup(
  namespaceId: string,
  groupId: string,
): Promise<void> {
  const user = await requireAdmin();
  const namespace = await prisma.mcpNamespace.findUnique({
    where: { id: namespaceId },
    select: {
      groups: {
        select: { id: true },
      },
    },
  });

  if (!namespace) {
    throw new Error("Namespace not found.");
  }

  if (namespace.groups.some((group) => group.id === groupId)) {
    return;
  }

  await prisma.mcpNamespace.update({
    where: { id: namespaceId },
    data: {
      groups: {
        connect: { id: groupId },
      },
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "namespace.group.add",
    resource: "McpNamespace",
    resourceId: `${namespaceId}:${groupId}`,
    metadata: { namespaceId, groupId },
  });
  revalidatePath(`/admin/namespaces/${namespaceId}`);
  revalidatePath("/admin/namespaces");
}

export async function deleteNamespaceGroup(
  namespaceId: string,
  groupId: string,
): Promise<void> {
  const user = await requireAdmin();
  const namespace = await prisma.mcpNamespace.findUnique({
    where: { id: namespaceId },
    select: {
      groups: {
        select: { id: true },
      },
    },
  });

  if (!namespace || !namespace.groups.some((group) => group.id === groupId)) {
    throw new Error("Group is not assigned to this namespace.");
  }

  await prisma.mcpNamespace.update({
    where: { id: namespaceId },
    data: {
      groups: {
        disconnect: { id: groupId },
      },
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "namespace.group.remove",
    resource: "McpNamespace",
    resourceId: `${namespaceId}:${groupId}`,
    metadata: { namespaceId, groupId },
  });
  revalidatePath(`/admin/namespaces/${namespaceId}`);
  revalidatePath("/admin/namespaces");
}

export async function setNamespaceAllUsers(
  namespaceId: string,
  allUsers: boolean,
): Promise<void> {
  const user = await requireAdmin();

  if (!allUsers) {
    return;
  }

  await prisma.mcpNamespace.update({
    where: { id: namespaceId },
    data: {
      groups: { set: [] },
      users: { set: [] },
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "namespace.access.update",
    resource: "McpNamespace",
    resourceId: namespaceId,
    metadata: { allUsers, namespaceId },
  });
  revalidatePath(`/admin/namespaces/${namespaceId}`);
  revalidatePath("/admin/namespaces");
}

export async function deleteNamespace(namespaceId: string): Promise<void> {
  const user = await requireAdmin();

  const namespace = await prisma.mcpNamespace.findUnique({
    where: { id: namespaceId },
    select: { name: true },
  });
  if (!namespace) throw new Error("Namespace não encontrado.");

  await prisma.mcpNamespace.delete({ where: { id: namespaceId } });

  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: "namespace.delete",
    resource: "McpNamespace",
    resourceId: namespaceId,
    metadata: { name: namespace.name },
  });

  revalidatePath("/admin/namespaces");
  redirect("/admin/namespaces");
}

export async function setNamespaceToolEnabled(
  namespaceId: string,
  namespaceToolId: string,
  enabled: boolean,
): Promise<void> {
  const user = await requireAdmin();

  const result = await prisma.namespaceTool.updateMany({
    where: {
      id: namespaceToolId,
      namespaceId,
    },
    data: {
      enabled,
    },
  });

  if (result.count === 0) {
    throw new Error("Tool does not belong to this namespace.");
  }

  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: enabled ? "namespace.tool.enable" : "namespace.tool.disable",
    resource: "NamespaceTool",
    resourceId: namespaceToolId,
    metadata: { enabled, namespaceId },
  });
  revalidatePath(`/admin/namespaces/${namespaceId}`);
  revalidatePath("/admin/namespaces");
}
