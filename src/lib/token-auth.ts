import { prisma } from "@/lib/db";
import { hashToken, resolveOAuthAccessToken } from "@/lib/oauth-server";

export async function resolveTokenUser(
  bearerToken: string,
): Promise<{ userId: string; userEmail: string | null; entraGroups: string[]; tokenId: string; scope?: string } | null> {
  if (!bearerToken || bearerToken.length < 16) return null;

  // Try OAuth access token first (prefix mcp_at_)
  if (bearerToken.startsWith("mcp_at_")) {
    const oauthUser = await resolveOAuthAccessToken(bearerToken);
    if (oauthUser) {
      return {
        userId: oauthUser.userId,
        userEmail: oauthUser.userEmail,
        entraGroups: oauthUser.entraGroups,
        tokenId: `oauth:${oauthUser.userId}`,
        scope: oauthUser.scope,
      };
    }
  }

  // Fall back to PersonalToken (legacy - deprecation window 90 days)
  const tokenHash = hashToken(bearerToken);

  const record = await prisma.personalToken.findUnique({
    where: { tokenHash },
    include: {
      user: { select: { id: true, email: true, entraGroups: true } },
    },
  });

  if (!record) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  // Update lastUsedAt asynchronously - don't block the response
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
