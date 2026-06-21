"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function setMcpEnabled(mcpServerId: string, enabled: boolean): Promise<void> {
  const user = await requireAuth();
  await prisma.userMcpPreference.upsert({
    where: { userId_mcpServerId: { userId: user.id, mcpServerId } },
    create: { userId: user.id, mcpServerId, enabled },
    update: { enabled },
  });
  logAudit({
    userId: user.id,
    userEmail: user.email ?? undefined,
    action: enabled ? "user.mcp.enable" : "user.mcp.disable",
    resource: "McpServer",
    resourceId: mcpServerId,
  });
  revalidatePath("/connections");
}
