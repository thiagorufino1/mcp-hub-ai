import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 min
export const REFRESH_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
export const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 min

const VALID_SCOPES = new Set(["mcp:proxy"]);

export function generateOpaqueToken(prefix: "mcp_at_" | "mcp_rt_" = "mcp_at_"): string {
  return prefix + randomBytes(32).toString("hex");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function hashPkceVerifier(verifier: string): string {
  // PKCE S256: base64url(sha256(verifier))
  return createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function validateScope(requested: string): string | null {
  const parts = requested.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  const valid = parts.filter((s) => {
    if (VALID_SCOPES.has(s)) return true;
    if (s.startsWith("mcp:namespace:")) {
      const parts = s.split(":");
      return parts.length === 3 && parts[2].length > 0;
    }
    return false;
  });

  return valid.length > 0 ? valid.join(" ") : null;
}

export async function createOAuthClient(args: {
  clientName: string;
  clientUri?: string;
  redirectUris: string[];
  grantTypes?: string[];
  responseTypes?: string[];
  tokenEndpointAuthMethod?: string;
}) {
  return prisma.oAuthClient.create({
    data: {
      clientName: args.clientName,
      clientUri: args.clientUri,
      redirectUris: args.redirectUris,
      grantTypes: args.grantTypes ?? ["authorization_code", "refresh_token"],
      responseTypes: args.responseTypes ?? ["code"],
      tokenEndpointAuthMethod: args.tokenEndpointAuthMethod ?? "none",
    },
  });
}

export async function createAuthCode(args: {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string; // already S256-hashed by client; we store as-is to compare later
}) {
  const raw = generateOpaqueToken();
  const codeHash = hashToken(raw);

  await prisma.oAuthAuthCode.create({
    data: {
      clientId: args.clientId,
      userId: args.userId,
      codeHash,
      redirectUri: args.redirectUri,
      scope: args.scope,
      codeChallengeHash: args.codeChallenge, // S256 value sent by client
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
    },
  });

  return raw;
}

export async function consumeAuthCode(
  rawCode: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<{ userId: string; scope: string } | null> {
  const codeHash = hashToken(rawCode);

  // Atomic mark-as-used — prevents replay via concurrent requests
  const updated = await prisma.oAuthAuthCode.updateMany({
    where: {
      codeHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
      clientId,
      redirectUri,
    },
    data: { usedAt: new Date() },
  });
  if (updated.count === 0) return null;

  // Now safe to read for userId/scope (record is marked used)
  const record = await prisma.oAuthAuthCode.findUnique({ where: { codeHash } });
  if (!record) return null;

  // PKCE S256 verification
  const computedChallenge = hashPkceVerifier(codeVerifier);
  if (computedChallenge !== record.codeChallengeHash) return null;

  return { userId: record.userId, scope: record.scope };
}

export async function createTokenPair(
  clientId: string,
  userId: string,
  scope: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const rawAccess = generateOpaqueToken("mcp_at_");
  const rawRefresh = generateOpaqueToken("mcp_rt_");
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);

  await Promise.all([
    prisma.oAuthAccessToken.create({
      data: {
        clientId,
        userId,
        tokenHash: hashToken(rawAccess),
        scope,
        expiresAt,
      },
    }),
    prisma.oAuthRefreshToken.create({
      data: {
        clientId,
        userId,
        tokenHash: hashToken(rawRefresh),
        scope,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    }),
  ]);

  return { accessToken: rawAccess, refreshToken: rawRefresh, expiresAt };
}

export async function resolveOAuthAccessToken(
  raw: string,
): Promise<{ userId: string; userEmail: string | null; entraGroups: string[]; scope: string } | null> {
  const tokenHash = hashToken(raw);

  const record = await prisma.oAuthAccessToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, entraGroups: true } } },
  });

  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt < new Date()) return null;

  void prisma.oAuthAccessToken
    .update({ where: { tokenHash }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return {
    userId: record.userId,
    userEmail: record.user.email,
    entraGroups: record.user.entraGroups,
    scope: record.scope,
  };
}

export async function rotateRefreshToken(
  rawRefresh: string,
  clientId: string,
): Promise<{ userId: string; scope: string } | null> {
  const tokenHash = hashToken(rawRefresh);

  const record = await prisma.oAuthRefreshToken.findUnique({ where: { tokenHash } });
  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt < new Date()) return null;
  if (record.clientId !== clientId) return null;

  // Rotate: revoke old, caller creates new pair
  await prisma.oAuthRefreshToken.update({
    where: { tokenHash },
    data: { usedAt: new Date(), revokedAt: new Date() },
  });

  return { userId: record.userId, scope: record.scope };
}

export async function revokeToken(raw: string): Promise<void> {
  const tokenHash = hashToken(raw);
  await Promise.allSettled([
    prisma.oAuthAccessToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    }),
    prisma.oAuthRefreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    }),
  ]);
}
