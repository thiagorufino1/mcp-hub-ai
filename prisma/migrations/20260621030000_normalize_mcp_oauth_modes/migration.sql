-- OAuth access to corporate MCP servers is always delegated to the consuming user.
UPDATE "McpServer"
SET "authType" = 'oauth_delegated'
WHERE "authType" = 'oauth_shared';
