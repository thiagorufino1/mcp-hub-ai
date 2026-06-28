import { z } from "zod";

const nonEmptyStringArray = z.array(z.string()).default([]);

const serverEntrySchema = z.object({
  command: z.string().optional(),
  args: nonEmptyStringArray.optional(),
  url: z.string().optional(),
  type: z.string().optional(),
  transport: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  authType: z.string().optional(),
});

export const mcpImportSchema = z.object({
  mcpServers: z.record(z.string(), serverEntrySchema),
});

export type McpImportDocument = z.infer<typeof mcpImportSchema>;
export type McpImportEntry = z.infer<typeof serverEntrySchema>;

export function resolveMcpImportTransport(entry: McpImportEntry): string {
  const rawTransport = (entry.transport ?? entry.type ?? (entry.command ? "stdio" : "streamable-http")).trim();

  if (rawTransport === "http" || rawTransport === "streamable_http") {
    return "streamable-http";
  }

  return rawTransport;
}

export function parseMcpImportJson(raw: string): {
  ok: true;
  data: McpImportDocument;
} | {
  ok: false;
  error: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }

  const result = mcpImportSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues.map((issue) => issue.message).join(" "),
    };
  }

  return { ok: true, data: result.data };
}

export function validateMcpImportEntry(
  name: string,
  entry: McpImportEntry,
): string | null {
  const transport = resolveMcpImportTransport(entry);

  if (!["stdio", "sse", "streamable-http"].includes(transport)) {
    return `${name}: unsupported transport '${transport}'.`;
  }

  if (transport === "stdio" && !entry.command) {
    return `${name}: field 'command' is required for stdio transport.`;
  }

  if (transport !== "stdio" && !entry.url) {
    return `${name}: field 'url' is required for ${transport} transport.`;
  }

  return null;
}
