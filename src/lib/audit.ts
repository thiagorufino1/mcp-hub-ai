import { prisma } from "@/lib/db";
import type { InputJsonValue } from "@prisma/client/runtime/library";

export type AuditAction =
  // MCP Server
  | "mcp.create"
  | "mcp.update"
  | "mcp.delete"
  | "mcp.enable"
  | "mcp.disable"
  | "mcp.refresh"
  | "mcp.tool.enable"
  | "mcp.tool.disable"
  | "mcp.tool.permission"
  | "mcp.proxy"
  | "mcp.namespace"
  | "namespace.mcp.add"
  | "namespace.mcp.remove"
  | "namespace.group.add"
  | "namespace.group.remove"
  | "namespace.access.update"
  | "namespace.tool.enable"
  | "namespace.tool.disable"
  | "namespace.create"
  | "namespace.update"
  | "namespace.delete"
  // LLM Config
  | "llm.create"
  | "llm.update"
  | "llm.default"
  | "llm.delete"
  | "llm.test"
  | "llm.chat"
  // Group / Access Policy
  | "group.upsert"
  | "group.sync"
  | "group.delete"
  // User preferences
  | "user.mcp.enable"
  | "user.mcp.disable"
  // OAuth
  | "user.oauth.connect"
  | "user.oauth.disconnect"
  // Auth
  | "user.login";

export const ADMIN_ACTIVITY_ACTIONS = [
  "mcp.create", "mcp.update", "mcp.delete", "mcp.enable", "mcp.disable",
  "mcp.refresh", "mcp.tool.enable", "mcp.tool.disable", "mcp.tool.permission",
  "namespace.mcp.add", "namespace.mcp.remove", "namespace.group.add",
  "namespace.group.remove", "namespace.access.update", "namespace.create",
  "namespace.update", "namespace.delete", "namespace.tool.enable", "namespace.tool.disable",
  "llm.create", "llm.update", "llm.default", "llm.delete",
  "group.upsert", "group.delete",
] as const satisfies AuditAction[];

export async function logAudit(params: {
  userId?: string;
  userEmail?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  metadata?: InputJsonValue;
}): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        userId: params.userId ?? null,
        userEmail: params.userEmail ?? null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        metadata: params.metadata ?? {},
      },
    })
    .catch((err: unknown) => {
      console.error("[audit] Failed to write audit log:", err);
    });
}
