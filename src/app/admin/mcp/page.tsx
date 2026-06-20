import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { McpAdminClient } from "./client";
import type { McpServerRow } from "./actions";

export const metadata = { title: "MCP Servers — Admin" };

export default async function AdminMcpPage() {
  await requireAdmin();
  const mcps = await prisma.mcpServer.findMany({ orderBy: { createdAt: "asc" } });
  return <McpAdminClient mcps={mcps as McpServerRow[]} />;
}
