import { createHash } from "crypto";

function encodeToken(value: string) {
  return Buffer.from(value, "utf8").toString("hex");
}

export function buildStableMcpToolName(serverId: string, toolName: string) {
  const signature = createHash("sha256")
    .update(`${serverId}\0${toolName}`)
    .digest("hex")
    .slice(0, 12);

  return `mcp_${encodeToken(serverId)}_${encodeToken(toolName)}_${signature}`;
}
