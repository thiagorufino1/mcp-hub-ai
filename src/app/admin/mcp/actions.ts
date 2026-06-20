"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export type McpServerRow = {
  id: string;
  name: string;
  description: string | null;
  transport: string;
  command: string | null;
  args: string[];
  url: string | null;
  env: Record<string, string>;
  headers: Record<string, string>;
  authType: string;
  sharedSecret: string | null;
  enabled: boolean;
};

export async function createMcp(formData: FormData): Promise<void> {
  await requireAdmin();

  const transport = formData.get("transport") as string;
  const envRaw = (formData.get("env") as string | null) ?? "{}";
  const headersRaw = (formData.get("headers") as string | null) ?? "{}";
  const argsRaw = (formData.get("args") as string | null) ?? "";

  await prisma.mcpServer.create({
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string | null) || null,
      transport,
      command: transport === "stdio" ? (formData.get("command") as string) : null,
      args: argsRaw ? argsRaw.split("\n").map((a) => a.trim()).filter(Boolean) : [],
      url: transport !== "stdio" ? (formData.get("url") as string) : null,
      env: JSON.parse(envRaw) as Record<string, string>,
      headers: JSON.parse(headersRaw) as Record<string, string>,
      authType: (formData.get("authType") as string) ?? "none",
      sharedSecret: (formData.get("sharedSecret") as string | null) || null,
      enabled: formData.get("enabled") === "true",
    },
  });

  revalidatePath("/admin/mcp");
}

export async function updateMcp(id: string, formData: FormData): Promise<void> {
  await requireAdmin();

  const transport = formData.get("transport") as string;
  const envRaw = (formData.get("env") as string | null) ?? "{}";
  const headersRaw = (formData.get("headers") as string | null) ?? "{}";
  const argsRaw = (formData.get("args") as string | null) ?? "";

  await prisma.mcpServer.update({
    where: { id },
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string | null) || null,
      transport,
      command: transport === "stdio" ? (formData.get("command") as string) : null,
      args: argsRaw ? argsRaw.split("\n").map((a) => a.trim()).filter(Boolean) : [],
      url: transport !== "stdio" ? (formData.get("url") as string) : null,
      env: JSON.parse(envRaw) as Record<string, string>,
      headers: JSON.parse(headersRaw) as Record<string, string>,
      authType: (formData.get("authType") as string) ?? "none",
      sharedSecret: (formData.get("sharedSecret") as string | null) || null,
      enabled: formData.get("enabled") === "true",
    },
  });

  revalidatePath("/admin/mcp");
}

export async function deleteMcp(id: string): Promise<void> {
  await requireAdmin();
  await prisma.mcpServer.delete({ where: { id } });
  revalidatePath("/admin/mcp");
}
