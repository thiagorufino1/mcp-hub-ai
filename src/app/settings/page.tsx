import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { SettingsClient } from "./client";

export const metadata = { title: "Settings — MCP Hub" };

export default async function SettingsPage() {
  const user = await requireAuth();

  const tokens = await prisma.personalToken.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, lastUsedAt: true, createdAt: true },
  });

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const proxyUrl = `${protocol}://${host}/api/mcp/proxy`;

  return <SettingsClient tokens={tokens} proxyUrl={proxyUrl} />;
}
