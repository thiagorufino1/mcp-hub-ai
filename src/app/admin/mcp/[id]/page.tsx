import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { decryptSecretJson } from "@/lib/secret-crypto";

import { McpServerDetailClient } from "./client";

export const metadata: Metadata = {
  title: "MCP Server details - Admin",
};

export default async function McpServerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const mcp = await prisma.mcpServer.findUnique({
    where: { id },
    include: {
      registryTools: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          enabled: true,
          permissionMode: true,
          readOnly: true,
          destructive: true,
        },
      },
      namespaceMembers: {
        orderBy: [{ namespace: { name: "asc" } }],
        select: {
          id: true,
          enabled: true,
          namespaceId: true,
          namespace: {
            select: {
              id: true,
              name: true,
              alias: true,
              enabled: true,
              published: true,
            },
          },
        },
      },
    },
  });

  if (!mcp) notFound();

  return (
    <McpServerDetailClient
      mcp={{
        id: mcp.id,
        name: mcp.name,
        description: mcp.description,
        transport: mcp.transport,
        command: mcp.command,
        args: mcp.args,
        url: mcp.url,
        headers: {},
        headerKeys: Object.keys(decryptSecretJson(mcp.headers)),
        enabled: mcp.enabled,
        authType: mcp.authType,
        healthStatus: mcp.healthStatus,
        lastHealthCheckAt: mcp.lastHealthCheckAt,
        lastLatencyMs: mcp.lastLatencyMs,
        consecutiveFailures: mcp.consecutiveFailures,
        connectionTimeoutMs: mcp.connectionTimeoutMs,
        toolTimeoutMs: mcp.toolTimeoutMs,
        maxRetries: mcp.maxRetries,
        failureThreshold: mcp.failureThreshold,
        circuitCooldownMs: mcp.circuitCooldownMs,
        maxConcurrentCalls: mcp.maxConcurrentCalls,
        rateLimitRequests: mcp.rateLimitRequests,
        rateLimitWindowMs: mcp.rateLimitWindowMs,
        circuitState: mcp.circuitState,
        circuitOpenedAt: mcp.circuitOpenedAt,
        createdAt: mcp.createdAt.toISOString(),
        updatedAt: mcp.updatedAt.toISOString(),
        registryTools: mcp.registryTools.map((tool) => ({
          ...tool,
        })),
        namespaces: mcp.namespaceMembers.map((entry) => ({
          id: entry.id,
          enabled: entry.enabled,
          namespaceId: entry.namespaceId,
          namespace: entry.namespace,
        })),
      }}
    />
  );
}
