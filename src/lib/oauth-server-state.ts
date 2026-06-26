import { createHmac, timingSafeEqual } from "crypto";

type AuthorizeStatePayload = {
  clientId: string;
  expiresAt: number;
  nonce: string;
  redirectUri: string;
  scope: string;
};

function secret() {
  const s = process.env.NEXTAUTH_SECRET?.trim();
  if (!s) throw new Error("NEXTAUTH_SECRET required");
  return s;
}

function sign(encoded: string) {
  return createHmac("sha256", secret()).update(encoded).digest("base64url");
}

export function createAuthorizeState(payload: Omit<AuthorizeStatePayload, "nonce" | "expiresAt">) {
  const full: AuthorizeStatePayload = {
    ...payload,
    nonce: crypto.randomUUID(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAuthorizeState(state: string): AuthorizeStatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts as [string, string];

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as AuthorizeStatePayload;
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
