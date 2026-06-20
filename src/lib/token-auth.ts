import { createHash } from "crypto";
import { prisma } from "@/lib/db";

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function resolveTokenUser(
  bearerToken: string,
): Promise<{ userId: string; entraGroups: string[] } | null> {
  if (!bearerToken || bearerToken.length < 16) return null;

  const tokenHash = hashToken(bearerToken);

  const record = await prisma.personalToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: { accounts: { select: { provider: true } } },
      },
    },
  });

  if (!record) return null;

  // Update lastUsedAt asynchronously — don't block the response
  void prisma.personalToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  // Entra groups are stored on the session JWT, not in the DB User record.
  // For token-based auth we can't get JWT groups — use the entraGroups array if we store it,
  // or fall back to looking up the user's AccessPolicies directly in getUserContext.
  // For now return empty groups — getUserContext handles empty-groups gracefully (returns empty context).
  // In Phase 5 we'll store groups on the User record.
  return { userId: record.userId, entraGroups: [] };
}
