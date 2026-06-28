import { requireAdmin } from "@/lib/auth-helpers";
import { McpImportPageClient } from "./import-client";

export const metadata = { title: "Import MCP Servers - Admin" };

export default async function AdminMcpImportPage() {
  await requireAdmin();

  return <McpImportPageClient />;
}
