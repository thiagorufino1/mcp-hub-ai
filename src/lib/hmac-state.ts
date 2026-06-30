import { createHmac, randomUUID, timingSafeEqual } from "crypto";

function secret() {
  const s = process.env.NEXTAUTH_SECRET?.trim();
  if (!s) throw new Error("NEXTAUTH_SECRET required");
  return s;
}

export function signEncoded(encoded: string): string {
  return createHmac("sha256", secret()).update(encoded).digest("base64url");
}

export function createSignedToken<T extends object>(payload: T & { expiresAt: number; nonce: string }): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signEncoded(encoded)}`;
}

export function verifySignedToken<T extends { expiresAt: number }>(state: string): T | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts as [string, string];

  const expected = signEncoded(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as T;
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export { randomUUID };
