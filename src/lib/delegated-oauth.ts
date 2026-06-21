import { prisma } from "@/lib/db";
import { discoverMcpOAuth, refreshMcpOAuthToken } from "@/lib/mcp-oauth";
import {
  decryptSecret,
  encryptSecret,
} from "@/lib/secret-crypto";

const REFRESH_WINDOW_MS = 60_000;

export async function resolveDelegatedAuthorizationHeaders(
  userId: string,
  mcpServerIds: string[],
) {
  const headersByServer = new Map<string, string>();
  if (mcpServerIds.length === 0) return headersByServer;

  const connections = await prisma.userMcpConnection.findMany({
    where: {
      userId,
      mcpServerId: { in: mcpServerIds },
      status: "connected",
      mcpServer: { authType: "oauth_delegated", enabled: true },
    },
    include: {
      mcpServer: {
        select: {
          oauthClientId: true,
          oauthClientSecret: true,
          url: true,
        },
      },
    },
  });

  for (const connection of connections) {
    const expiresSoon =
      connection.expiresAt !== null &&
      connection.expiresAt.getTime() <= Date.now() + REFRESH_WINDOW_MS;

    if (!expiresSoon) {
      headersByServer.set(
        connection.mcpServerId,
        `${connection.tokenType || "Bearer"} ${decryptSecret(connection.accessToken)}`,
      );
      continue;
    }

    const refreshToken = decryptSecret(connection.refreshToken);
    const clientId = connection.mcpServer.oauthClientId?.trim();
    const resourceUrl = connection.mcpServer.url?.trim();
    if (!refreshToken || !clientId || !resourceUrl) {
      await markConnectionExpired(connection.id);
      continue;
    }

    try {
      const discovery = await discoverMcpOAuth(resourceUrl);
      const refreshed = await refreshMcpOAuthToken({
        accessToken: decryptSecret(connection.accessToken),
        clientId,
        clientSecret:
          decryptSecret(connection.mcpServer.oauthClientSecret) || undefined,
        expiresAt: connection.expiresAt?.toISOString(),
        refreshToken,
        resourceUrl: discovery.resourceUrl,
        tokenEndpoint: discovery.tokenEndpoint,
        tokenType: connection.tokenType,
      });

      if (!refreshed?.accessToken) {
        await markConnectionExpired(connection.id);
        continue;
      }

      const tokenType = refreshed.tokenType || connection.tokenType || "Bearer";
      await prisma.userMcpConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: encryptSecret(refreshed.accessToken),
          expiresAt: refreshed.expiresAt
            ? new Date(refreshed.expiresAt)
            : connection.expiresAt,
          refreshToken: refreshed.refreshToken
            ? encryptSecret(refreshed.refreshToken)
            : connection.refreshToken,
          scope: refreshed.scope ?? connection.scope,
          status: "connected",
          tokenType,
        },
      });

      headersByServer.set(
        connection.mcpServerId,
        `${tokenType} ${refreshed.accessToken}`,
      );
    } catch (error) {
      console.warn(
        `[delegated-oauth] Failed to refresh connection ${connection.id}:`,
        error instanceof Error ? error.message : error,
      );
      await markConnectionExpired(connection.id);
    }
  }

  return headersByServer;
}

async function markConnectionExpired(id: string) {
  await prisma.userMcpConnection.update({
    where: { id },
    data: { status: "expired" },
  });
}
