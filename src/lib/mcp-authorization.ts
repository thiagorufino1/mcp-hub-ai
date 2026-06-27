import type { McpDiscoveredTool, McpServerConfig } from "@/types/mcp";

export function getApprovedTools(server: McpServerConfig): McpDiscoveredTool[] {
  return server.approvalMode === "always" ? server.tools : [];
}

export function isToolExecutionAllowed(
  server: Pick<McpServerConfig, "approvalMode">,
  toolName: string,
) {
  return server.approvalMode === "always";
}
