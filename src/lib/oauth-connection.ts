import type { UserMcpConnection } from "@prisma/client";

export function isOAuthConnectionActive(
  connection: Pick<UserMcpConnection, "status" | "expiresAt"> | null | undefined,
  now = new Date(),
) {
  if (!connection || connection.status !== "connected") {
    return false;
  }

  return connection.expiresAt === null || connection.expiresAt > now;
}
