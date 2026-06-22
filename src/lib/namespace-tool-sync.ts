import { prisma } from "@/lib/db";

type DesiredTool = {
  alias: string;
  description: string | null;
  displayName: string | null;
  registryToolId: string;
};

export async function syncNamespaceToolsForNamespace(namespaceId: string) {
  const namespace = await prisma.mcpNamespace.findUnique({
    where: { id: namespaceId },
    select: {
      id: true,
      servers: {
        orderBy: [{ displayOrder: "asc" }, { mcpServer: { name: "asc" } }],
        where: { enabled: true },
        select: {
          alias: true,
          mcpServer: {
            select: {
              name: true,
              registryTools: {
                orderBy: { name: "asc" },
                where: {
                  enabled: true,
                  permissionMode: { not: "blocked" },
                },
                select: {
                  description: true,
                  displayName: true,
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!namespace) return;

  const desired = new Map<string, DesiredTool>();
  for (const server of namespace.servers) {
    const prefix = normalizeAliasPrefix(server.alias ?? server.mcpServer.name);
    for (const tool of server.mcpServer.registryTools) {
      desired.set(tool.id, {
        alias: buildAlias(prefix, tool.name),
        description: tool.description,
        displayName: tool.displayName,
        registryToolId: tool.id,
      });
    }
  }

  await syncNamespaceTools(namespace.id, [...desired.values()]);
}

export async function syncNamespaceToolsForMcpServer(mcpServerId: string) {
  const namespaces = await prisma.namespaceMcpServer.findMany({
    where: { mcpServerId },
    select: { namespaceId: true },
  });

  await Promise.all(
    [...new Set(namespaces.map((entry) => entry.namespaceId))].map((namespaceId) =>
      syncNamespaceToolsForNamespace(namespaceId),
    ),
  );
}

async function syncNamespaceTools(namespaceId: string, desiredTools: DesiredTool[]) {
  const existingTools = await prisma.namespaceTool.findMany({
    where: { namespaceId },
    select: { id: true, registryToolId: true },
  });

  const desiredRegistryToolIds = new Set(desiredTools.map((tool) => tool.registryToolId));
  const existingByRegistryToolId = new Map(
    existingTools.map((tool) => [tool.registryToolId, tool.id]),
  );

  const operations = [
    ...existingTools
      .filter((tool) => !desiredRegistryToolIds.has(tool.registryToolId))
      .map((tool) =>
        prisma.namespaceTool.delete({
          where: { id: tool.id },
        }),
      ),
    ...desiredTools
      .filter((tool) => !existingByRegistryToolId.has(tool.registryToolId))
      .map((tool) =>
        prisma.namespaceTool.create({
          data: {
            alias: tool.alias,
            description: tool.description,
            displayName: tool.displayName,
            enabled: true,
            namespaceId,
            registryToolId: tool.registryToolId,
          },
        }),
      ),
  ];

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }
}

function buildAlias(prefix: string, name: string) {
  return normalizeAlias(`${prefix}_${name}`);
}

function normalizeAliasPrefix(value: string) {
  return normalizeAlias(value).slice(0, 32) || "namespace";
}

function normalizeAlias(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
