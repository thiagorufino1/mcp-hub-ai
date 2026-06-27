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

function decodeToken(value: string) {
  return Buffer.from(value, "hex").toString("utf8");
}

export function parseStableMcpToolName(functionName: string) {
  if (!functionName.startsWith("mcp_")) {
    return null;
  }

  const parts = functionName.split("_");
  if (parts.length !== 4) {
    return null;
  }

  try {
    return {
      serverId: decodeToken(parts[1]),
      toolName: decodeToken(parts[2]),
    };
  } catch {
    return null;
  }
}
