import { createHmac, timingSafeEqual } from "crypto";

type CorporateOAuthStatePayload = {
  expiresAt: number;
  mcpServerId: string;
  nonce: string;
  userId: string;
};

function getSigningSecret() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for corporate OAuth.");
  }
  return secret;
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createCorporateOAuthState(
  userId: string,
  mcpServerId: string,
  ttlMs = 10 * 60 * 1000,
) {
  const payload: CorporateOAuthStatePayload = {
    expiresAt: Date.now() + ttlMs,
    mcpServerId,
    nonce: crypto.randomUUID(),
    userId,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyCorporateOAuthState(
  state: string,
  expected: { mcpServerId: string; userId: string },
) {
  const [encodedPayload, signature, ...extra] = state.split(".");
  if (!encodedPayload || !signature || extra.length > 0) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<CorporateOAuthStatePayload>;

    return (
      payload.userId === expected.userId &&
      payload.mcpServerId === expected.mcpServerId &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt > Date.now() &&
      typeof payload.nonce === "string" &&
      payload.nonce.length > 0
    );
  } catch {
    return false;
  }
}
