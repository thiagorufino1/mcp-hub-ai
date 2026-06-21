import type { McpOAuthConfig } from "@/types/mcp";

export type McpOAuthDiscovery = {
  authorizationEndpoint: string;
  authorizationServerUrl: string;
  registrationEndpoint?: string;
  resourceUrl: string;
  scopesSupported?: string[];
  tokenEndpoint: string;
};

export type McpOAuthClientRegistration = {
  clientId: string;
  clientSecret?: string;
  clientSecretExpiresAt?: number;
};

export type McpOAuthStartResult = {
  authorizationUrl: string;
  clientId: string;
  clientSecret?: string;
  codeVerifier: string;
  redirectUri: string;
  registration?: McpOAuthClientRegistration;
  resourceUrl: string;
  scope?: string;
  state: string;
  tokenEndpoint: string;
};

export type McpOAuthExchangeResult = {
  accessToken: string;
  expiresAt?: string;
  refreshToken?: string;
  scope?: string;
  tokenType?: string;
};

type OAuthWellKnownResponse = {
  authorization_servers?: string[];
  authorizationServers?: string[];
  resource?: string;
  resourceName?: string;
  resource_documentation?: string;
};

type AuthorizationServerMetadata = {
  authorization_endpoint?: string;
  authorizationEndpoint?: string;
  token_endpoint?: string;
  tokenEndpoint?: string;
  registration_endpoint?: string;
  registrationEndpoint?: string;
  scopes_supported?: string[];
  scopesSupported?: string[];
};

function normalizePathname(pathname: string) {
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  return trimmed.replace(/\/+$/, "");
}

function readFirstArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : undefined;
}

function normalizeString(value: string | undefined) {
  return value?.trim() || undefined;
}

function extractResourceMetadataUrl(headerValue: string | null) {
  if (!headerValue) {
    return null;
  }

  const match =
    headerValue.match(/resource_metadata="([^"]+)"/i) ??
    headerValue.match(/resource_metadata=([^,; ]+)/i);

  return match?.[1] ? match[1].trim() : null;
}

async function fetchJson<T>(candidate: string | URL) {
  const response = await fetch(candidate, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

async function discoverProtectedResourceMetadata(resourceUrl: string) {
  const parsedResourceUrl = new URL(resourceUrl);
  const resourcePath = normalizePathname(parsedResourceUrl.pathname);
  const resourceMetadataCandidates = [
    new URL("/.well-known/oauth-protected-resource", parsedResourceUrl.origin).toString(),
    ...(resourcePath
      ? [new URL(`/.well-known/oauth-protected-resource${resourcePath}`, parsedResourceUrl.origin).toString()]
      : []),
  ];

  const probeResponse = await fetch(parsedResourceUrl.toString(), {
    headers: { Accept: "application/json" },
    method: "GET",
  }).catch(() => null);

  const hintedResourceMetadataUrl = extractResourceMetadataUrl(
    probeResponse?.headers.get("WWW-Authenticate") ?? null,
  );

  const discoveryCandidates = [
    ...(hintedResourceMetadataUrl ? [hintedResourceMetadataUrl] : []),
    ...resourceMetadataCandidates,
  ];

  for (const candidate of discoveryCandidates) {
    const resourceMetadata = await fetchJson<OAuthWellKnownResponse>(candidate);
    if (resourceMetadata) {
      return {
        resourceMetadata,
        resourceMetadataUrl: candidate,
      };
    }
  }

  throw new Error(
    `OAuth discovery failed. Could not read protected resource metadata from ${resourceMetadataCandidates[0]}.`,
  );
}

async function discoverAuthorizationServerMetadata(authorizationServerUrl: string) {
  const parsedAuthorizationServerUrl = new URL(authorizationServerUrl);
  const authPath = normalizePathname(parsedAuthorizationServerUrl.pathname);
  const candidates = [
    new URL("/.well-known/oauth-authorization-server", parsedAuthorizationServerUrl.origin).toString(),
    new URL("/.well-known/openid-configuration", parsedAuthorizationServerUrl.origin).toString(),
    ...(authPath
      ? [
          new URL(`/.well-known/oauth-authorization-server${authPath}`, parsedAuthorizationServerUrl.origin).toString(),
          new URL(`/.well-known/openid-configuration${authPath}`, parsedAuthorizationServerUrl.origin).toString(),
          new URL(`${authPath}/.well-known/oauth-authorization-server`, parsedAuthorizationServerUrl.origin).toString(),
          new URL(`${authPath}/.well-known/openid-configuration`, parsedAuthorizationServerUrl.origin).toString(),
        ]
      : []),
  ];

  for (const candidate of candidates) {
    const metadata = await fetchJson<AuthorizationServerMetadata>(candidate);
    if (metadata) {
      return {
        authorizationServerMetadata: metadata,
        authorizationServerMetadataUrl: candidate,
      };
    }
  }

  throw new Error(
    `OAuth discovery failed. Could not read authorization server metadata from ${candidates[0]}.`,
  );
}

export async function discoverMcpOAuth(resourceUrl: string): Promise<McpOAuthDiscovery> {
  const { resourceMetadata } = await discoverProtectedResourceMetadata(resourceUrl);
  const authorizationServers =
    readFirstArray(resourceMetadata.authorization_servers) ??
    readFirstArray(resourceMetadata.authorizationServers);

  if (!authorizationServers || authorizationServers.length === 0) {
    throw new Error("OAuth discovery failed. Server did not advertise any authorization servers.");
  }

  const { authorizationServerMetadata } = await discoverAuthorizationServerMetadata(
    authorizationServers[0] as string,
  );
  const authorizationEndpoint =
    normalizeString(authorizationServerMetadata.authorization_endpoint) ??
    normalizeString(authorizationServerMetadata.authorizationEndpoint);
  const tokenEndpoint =
    normalizeString(authorizationServerMetadata.token_endpoint) ??
    normalizeString(authorizationServerMetadata.tokenEndpoint);
  const registrationEndpoint =
    normalizeString(authorizationServerMetadata.registration_endpoint) ??
    normalizeString(authorizationServerMetadata.registrationEndpoint);
  const scopesSupported =
    readFirstArray(authorizationServerMetadata.scopes_supported) ??
    readFirstArray(authorizationServerMetadata.scopesSupported);

  if (!authorizationEndpoint || !tokenEndpoint) {
    throw new Error("OAuth discovery failed. Authorization or token endpoint missing.");
  }

  return {
    authorizationEndpoint,
    authorizationServerUrl: authorizationServers[0] as string,
    registrationEndpoint,
    resourceUrl: normalizeString(resourceMetadata.resource) ?? resourceUrl,
    scopesSupported,
    tokenEndpoint,
  };
}

function base64UrlEncode(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

export async function createPkcePair() {
  const codeVerifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const challengeBytes = await sha256(codeVerifier);

  return {
    codeChallenge: base64UrlEncode(challengeBytes),
    codeVerifier,
  };
}

export function buildMcpOAuthAuthorizationUrl(
  discovery: McpOAuthDiscovery,
  args: {
    clientId: string;
    codeChallenge: string;
    redirectUri: string;
    scope?: string;
    state: string;
  },
) {
  const url = new URL(discovery.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", args.clientId);
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("code_challenge", args.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", args.state);
  url.searchParams.set("resource", discovery.resourceUrl);
  if (args.scope) {
    url.searchParams.set("scope", args.scope);
  }
  return url.toString();
}

export async function registerMcpOAuthClient(
  discovery: McpOAuthDiscovery,
  args: {
    clientName: string;
    clientUri?: string;
    redirectUri: string;
  },
): Promise<McpOAuthClientRegistration | null> {
  if (!discovery.registrationEndpoint) {
    return null;
  }

  const response = await fetch(discovery.registrationEndpoint, {
    body: JSON.stringify({
      client_name: args.clientName,
      client_uri: args.clientUri,
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [args.redirectUri],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    client_id?: string;
    client_secret?: string;
    client_secret_expires_at?: number;
  };

  if (!payload.client_id) {
    return null;
  }

  return {
    clientId: payload.client_id,
    clientSecret: payload.client_secret,
    clientSecretExpiresAt: payload.client_secret_expires_at,
  };
}

export async function exchangeMcpOAuthCode(
  tokenEndpoint: string,
  args: {
    clientId: string;
    code: string;
    codeVerifier: string;
    redirectUri: string;
    clientSecret?: string;
    resourceUrl: string;
  },
): Promise<McpOAuthExchangeResult> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    code: args.code,
    code_verifier: args.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: args.redirectUri,
    resource: args.resourceUrl,
  });

  const headers: HeadersInit = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (args.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${args.clientId}:${args.clientSecret}`).toString("base64")}`;
  }

  const response = await fetch(tokenEndpoint, {
    body,
    headers,
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "OAuth token exchange failed.");
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  };

  if (!payload.access_token) {
    throw new Error("OAuth token exchange failed. Access token missing.");
  }

  const expiresAt =
    typeof payload.expires_in === "number" && Number.isFinite(payload.expires_in)
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : undefined;

  return {
    accessToken: payload.access_token,
    expiresAt,
    refreshToken: payload.refresh_token,
    scope: payload.scope,
    tokenType: payload.token_type,
  };
}

export async function refreshMcpOAuthToken(
  oauth: McpOAuthConfig,
): Promise<McpOAuthConfig | null> {
  if (!oauth.refreshToken || !oauth.tokenEndpoint || !oauth.clientId) {
    return null;
  }

  const body = new URLSearchParams({
    client_id: oauth.clientId,
    grant_type: "refresh_token",
    refresh_token: oauth.refreshToken,
    ...(oauth.resourceUrl ? { resource: oauth.resourceUrl } : {}),
  });

  const headers: HeadersInit = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (oauth.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${oauth.clientId}:${oauth.clientSecret}`).toString("base64")}`;
  }

  const response = await fetch(oauth.tokenEndpoint, {
    body,
    headers,
    method: "POST",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  };

  if (!payload.access_token) {
    return null;
  }

  return {
    ...oauth,
    accessToken: payload.access_token,
    expiresAt:
      typeof payload.expires_in === "number" && Number.isFinite(payload.expires_in)
        ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
        : oauth.expiresAt,
    refreshToken: payload.refresh_token ?? oauth.refreshToken,
    scope: payload.scope ?? oauth.scope,
    tokenType: payload.token_type ?? oauth.tokenType ?? "Bearer",
  };
}

export function isOAuthTokenExpired(oauth?: McpOAuthConfig) {
  if (!oauth?.expiresAt) {
    return false;
  }

  const expiresAt = Date.parse(oauth.expiresAt);
  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  return Date.now() >= expiresAt - 30_000;
}
