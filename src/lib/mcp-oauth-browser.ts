"use client";

export type PendingMcpOAuth = {
  authorizationServerUrl: string;
  clientId: string;
  clientName: string;
  clientSecret?: string;
  codeVerifier: string;
  redirectUri: string;
  resourceUrl: string;
  scope?: string;
  state: string;
  tokenEndpoint: string;
};

const PENDING_PREFIX = "mcp-hub-oauth-pending";

function getStorageKey(state: string) {
  return `${PENDING_PREFIX}:${state}`;
}

export function savePendingMcpOAuth(value: PendingMcpOAuth) {
  window.sessionStorage.setItem(getStorageKey(value.state), JSON.stringify(value));
}

export function readPendingMcpOAuth(state: string) {
  try {
    const raw = window.sessionStorage.getItem(getStorageKey(state));
    return raw ? (JSON.parse(raw) as PendingMcpOAuth) : null;
  } catch {
    return null;
  }
}

export function clearPendingMcpOAuth(state: string) {
  window.sessionStorage.removeItem(getStorageKey(state));
}

export function waitForMcpOAuthCallback(
  state: string,
  authUrl: string,
  options?: { timeoutMs?: number },
) {
  return new Promise<{ code?: string; error?: string; errorDescription?: string }>((resolve, reject) => {
    let popup: Window | null = null;
    let timeoutId: number | undefined;
    let intervalId: number | undefined;

    function cleanup() {
      window.removeEventListener("message", handleMessage);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      if (popup && !popup.closed) {
        popup.close();
      }
    }

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      const data = event.data as {
        code?: string;
        error?: string;
        errorDescription?: string;
        state?: string;
        type?: string;
      } | null;

      if (!data || data.type !== "mcp-oauth-callback" || data.state !== state) {
        return;
      }

      cleanup();
      resolve({
        code: data.code,
        error: data.error,
        errorDescription: data.errorDescription,
      });
    }

    window.addEventListener("message", handleMessage);
    popup = window.open(authUrl, "mcp-oauth", "width=520,height=720");

    if (!popup) {
      cleanup();
      reject(new Error("Popup blocked. Allow popups and try again."));
      return;
    }

    intervalId = window.setInterval(() => {
      if (popup?.closed) {
        cleanup();
        reject(new Error("OAuth popup closed before authorization completed."));
      }
    }, 400);

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("OAuth flow timed out."));
    }, options?.timeoutMs ?? 180000);
  });
}
