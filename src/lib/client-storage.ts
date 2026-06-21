"use client";

export const SESSION_LLM_CONFIG_KEY = "mcp-hub-session-llm-config";
export const SESSION_MCP_SERVER_KEY = "mcp-hub-session-mcp-servers";

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readSessionJson<T>(key: string): T | null {
  try {
    return parseJson<T>(window.sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

export function writeSessionJson(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

export function removeSessionValue(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function migrateLocalJsonToSession<T>(
  localKey: string,
  sessionKey: string,
): T | null {
  try {
    const sessionValue = parseJson<T>(window.sessionStorage.getItem(sessionKey));
    if (sessionValue) {
      return sessionValue;
    }

    const localValue = parseJson<T>(window.localStorage.getItem(localKey));
    if (!localValue) {
      return null;
    }

    window.sessionStorage.setItem(sessionKey, JSON.stringify(localValue));
    window.localStorage.removeItem(localKey);
    return localValue;
  } catch {
    return null;
  }
}
