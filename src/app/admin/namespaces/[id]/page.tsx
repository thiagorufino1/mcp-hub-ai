import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

import { NamespaceDetailClient } from "./client";

export const metadata: Metadata = {
  title: "Namespace details — Admin",
};

export default async function NamespaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [namespace, groups, users, mcpServers] = await Promise.all([
    prisma.mcpNamespace.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        alias: true,
        description: true,
        enabled: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        groups: {
          orderBy: { displayName: "asc" },
          select: {
            id: true,
            displayName: true,
            entraGroupId: true,
            memberCount: true,
            isActive: true,
            lastSyncedAt: true,
          },
        },
        users: {
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true, entraGroups: true },
        },
        servers: {
          orderBy: [{ displayOrder: "asc" }, { mcpServer: { name: "asc" } }],
          include: {
            mcpServer: {
              select: {
                id: true,
                name: true,
                transport: true,
                enabled: true,
                _count: {
                  select: {
                    registryTools: {
                      where: {
                        enabled: true,
                        permissionMode: { not: "blocked" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        tools: {
          where: {
            registryTool: {
              enabled: true,
              permissionMode: { not: "blocked" },
            },
          },
          orderBy: [{ registryTool: { mcpServer: { name: "asc" } } }, { alias: "asc" }],
          include: {
            registryTool: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
                permissionMode: true,
                enabled: true,
                readOnly: true,
                destructive: true,
                mcpServerId: true,
                mcpServer: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.entraGroup.findMany({
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        displayName: true,
        entraGroupId: true,
        memberCount: true,
        isActive: true,
        lastSyncedAt: true,
      },
    }),
    prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true, entraGroups: true },
    }),
    prisma.mcpServer.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, transport: true },
    }),
  ]);

  if (!namespace) notFound();

  const registeredToolsCount = await prisma.namespaceTool.count({
    where: { namespaceId: id },
  });
  const enabledServerIds = new Set(
    namespace.servers.filter((entry) => entry.enabled).map((entry) => entry.mcpServerId),
  );
  const toolCounts = new Map<string, number>();
  for (const tool of namespace.tools) {
    if (!tool.enabled) continue;
    if (!enabledServerIds.has(tool.registryTool.mcpServerId)) continue;
    toolCounts.set(
      tool.registryTool.mcpServerId,
      (toolCounts.get(tool.registryTool.mcpServerId) ?? 0) + 1,
    );
  }

  return (
    <NamespaceDetailClient
      namespace={{
        id: namespace.id,
        name: namespace.name,
        alias: namespace.alias,
        description: namespace.description,
        enabled: namespace.enabled,
        published: namespace.published,
        groups: namespace.groups,
        users: namespace.users,
        createdAt: namespace.createdAt.toISOString(),
        updatedAt: namespace.updatedAt.toISOString(),
        mcpServerIds: namespace.servers.map((entry) => entry.mcpServerId),
        toolsCount: registeredToolsCount,
      }}
      groups={groups.map((group) => ({
        ...group,
      }))}
      users={users}
      availableMcpServers={mcpServers}
      mcpServers={namespace.servers.map((entry) => ({
        id: entry.id,
        mcpServerId: entry.mcpServerId,
        name: entry.alias || entry.mcpServer.name,
        sourceName: entry.mcpServer.name,
        transport: entry.mcpServer.transport,
        sourceEnabled: entry.mcpServer.enabled,
        enabled: entry.enabled,
        visibleToolCount: toolCounts.get(entry.mcpServerId) ?? 0,
        totalToolCount: entry.mcpServer._count.registryTools,
      }))}
      tools={namespace.tools.map((tool) => ({
        id: tool.id,
        namespaceToolId: tool.id,
        mcpServerId: tool.registryTool.mcpServerId,
        mcpServerName: tool.registryTool.mcpServer.name,
        name: tool.alias,
        sourceName: tool.registryTool.name,
        displayName: tool.displayName ?? tool.registryTool.displayName,
        description: tool.description ?? tool.registryTool.description,
        sourcePermissionMode: normalizePermissionMode(tool.registryTool.permissionMode),
        enabled: tool.enabled,
        readOnly: tool.registryTool.readOnly,
        destructive: tool.registryTool.destructive,
      }))}
    />
  );
}

function normalizePermissionMode(
  permissionMode: string,
): "allow" | "approval" | "blocked" {
  if (permissionMode === "approval" || permissionMode === "blocked") {
    return permissionMode;
  }
  return "allow";
}
