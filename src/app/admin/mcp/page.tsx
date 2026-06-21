import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  decryptSecretJson,
} from "@/lib/secret-crypto";
import { McpAdminClient } from "./client";
import type { McpServerRow } from "./actions";

export const metadata = { title: "MCP Servers — Admin" };

export default async function AdminMcpPage() {
  await requireAdmin();
  const mcps = await prisma.mcpServer.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      registryTools: {
        orderBy: { name: "asc" },
        select: {
          destructive: true,
          displayName: true,
          enabled: true,
          id: true,
          name: true,
          permissionMode: true,
          readOnly: true,
        },
      },
    },
  });
  return (
    <McpAdminClient
      mcps={mcps.map((mcp) => ({
        ...mcp,
        env: decryptSecretJson(mcp.env),
        headers: decryptSecretJson(mcp.headers),
        oauthClientSecret: null,
        sharedSecret: null,
      })) satisfies McpServerRow[]}
    />
  );
}
