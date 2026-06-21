"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export async function setMcpEnabled(mcpServerId: string, enabled: boolean): Promise<void> {
  const user = await requireAuth();
  await prisma.userMcpPreference.upsert({
    where: { userId_mcpServerId: { userId: user.id, mcpServerId } },
    create: { userId: user.id, mcpServerId, enabled },
    update: { enabled },
  });
  revalidatePath("/connections");
}
