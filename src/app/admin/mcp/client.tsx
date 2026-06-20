"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { McpForm } from "@/components/admin/mcp-form";
import { deleteMcp } from "./actions";
import type { McpServerRow } from "./actions";

type Props = { mcps: McpServerRow[] };

export function McpAdminClient({ mcps }: Props) {
  const [form, setForm] = useState<{ open: boolean; mcp?: McpServerRow }>({ open: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">MCP Servers</h1>
        <Button onClick={() => setForm({ open: true })}>+ Add MCP</Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Transport</th>
              <th className="px-4 py-3 text-left font-medium">Auth</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mcps.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No MCP servers yet.
                </td>
              </tr>
            )}
            {mcps.map((mcp) => (
              <tr key={mcp.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{mcp.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{mcp.transport}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{mcp.authType}</td>
                <td className="px-4 py-3">
                  <Badge variant={mcp.enabled ? "default" : "secondary"}>
                    {mcp.enabled ? "enabled" : "disabled"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm({ open: true, mcp })}
                  >
                    Edit
                  </Button>
                  <form
                    action={async () => { await deleteMcp(mcp.id); }}
                    style={{ display: "inline" }}
                  >
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <McpForm
        open={form.open}
        mcp={form.mcp}
        onClose={() => setForm({ open: false })}
      />
    </div>
  );
}
