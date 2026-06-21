import type { McpDiscoveredTool, McpServerConfig } from "@/types/mcp";

export function getApprovedTools(server: McpServerConfig): McpDiscoveredTool[] {
  switch (server.approvalMode) {
    case "always":
      return server.tools;
    case "selected": {
      const approved = new Set(server.approvedToolNames);
      return server.tools.filter((tool) => approved.has(tool.name));
    }
    default:
      return [];
  }
}

export function isToolExecutionAllowed(
  server: Pick<McpServerConfig, "approvalMode" | "approvedToolNames">,
  toolName: string,
) {
  if (server.approvalMode === "always") {
    return true;
  }

  if (server.approvalMode === "selected") {
    return server.approvedToolNames.includes(toolName);
  }

  return false;
}
