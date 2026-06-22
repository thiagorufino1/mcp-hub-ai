import { createHash } from "crypto";
import { prisma } from "@/lib/db";

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function resolveTokenUser(
  bearerToken: string,
): Promise<{ userId: string; userEmail: string | null; entraGroups: string[]; tokenId: string } | null> {
  if (!bearerToken || bearerToken.length < 16) return null;

  const tokenHash = hashToken(bearerToken);

  const record = await prisma.personalToken.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true, email: true, entraGroups: true } },
    },
  });

  if (!record) return null;

  // Update lastUsedAt asynchronously — don't block the response
  void prisma.personalToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return {
    userId: record.userId,
    userEmail: record.user.email,
    entraGroups: record.user.entraGroups,
    tokenId: record.id,
  };
}
