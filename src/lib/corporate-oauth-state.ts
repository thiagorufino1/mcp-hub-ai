import { createSignedToken, verifySignedToken } from "./hmac-state";

type CorporateOAuthStatePayload = {
  expiresAt: number;
  mcpServerId: string;
  nonce: string;
  userId: string;
};

export function createCorporateOAuthState(
  userId: string,
  mcpServerId: string,
  ttlMs = 10 * 60 * 1000,
) {
  return createSignedToken<CorporateOAuthStatePayload>({
    expiresAt: Date.now() + ttlMs,
    mcpServerId,
    nonce: crypto.randomUUID(),
    userId,
  });
}

export function verifyCorporateOAuthState(
  state: string,
  expected: { mcpServerId: string; userId: string },
) {
  const payload = verifySignedToken<CorporateOAuthStatePayload>(state);
  return (
    payload !== null &&
    payload.userId === expected.userId &&
    payload.mcpServerId === expected.mcpServerId &&
    typeof payload.nonce === "string" &&
    payload.nonce.length > 0
  );
}
