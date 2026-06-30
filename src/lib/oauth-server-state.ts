import { randomUUID } from "crypto";
import { createSignedToken, verifySignedToken } from "./hmac-state";

type AuthorizeStatePayload = {
  clientId: string;
  expiresAt: number;
  nonce: string;
  redirectUri: string;
  scope: string;
};

export function createAuthorizeState(payload: Omit<AuthorizeStatePayload, "nonce" | "expiresAt">) {
  return createSignedToken<AuthorizeStatePayload>({
    ...payload,
    nonce: randomUUID(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}

export function verifyAuthorizeState(state: string): AuthorizeStatePayload | null {
  return verifySignedToken<AuthorizeStatePayload>(state);
}
