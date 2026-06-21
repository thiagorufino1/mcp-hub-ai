export type McpTransport = "stdio" | "sse" | "streamable-http";

export type McpConnectionStatus = "pending" | "connected" | "error";

export type McpApprovalMode = "always" | "never" | "selected";

export type McpAuthMode = "none" | "oauth";

export type McpOAuthConfig = {
  accessToken?: string;
  authorizationServerUrl?: string;
  clientId?: string;
  clientName?: string;
  clientSecret?: string;
  expiresAt?: string;
  refreshToken?: string;
  redirectUri?: string;
  resourceUrl?: string;
  scope?: string;
  tokenEndpoint?: string;
  tokenType?: string;
};

export type McpDiscoveredTool = {
  name: string;
  displayName?: string;
  description?: string;
  readOnly?: boolean;
  isDestructive?: boolean;
  permissionMode?: "allow" | "approval" | "blocked";
  inputSchema?: {
    type: "object";
    properties?: Record<string, object>;
    required?: string[];
  };
};

export type McpServerConfig = {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  authMode?: McpAuthMode;
  transport: McpTransport;
  command?: string;
  args: string[];
  url?: string;
  env: Record<string, string>;
  headers?: Record<string, string>;
  oauth?: McpOAuthConfig;
  tools: McpDiscoveredTool[];
  connectionStatus: McpConnectionStatus;
  errorMessage?: string;
  lastCheckedAt?: string;
  approvalMode: McpApprovalMode;
  approvedToolNames: string[];
  requiresUserAuthorization?: boolean;
  userAuthorizationStatus?: "connected" | "required";
};

export type McpInspectResponse = {
  server: McpServerConfig;
};
