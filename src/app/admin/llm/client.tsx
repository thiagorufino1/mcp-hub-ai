"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LlmForm } from "@/components/admin/llm-form";
import { deleteLlm } from "./actions";
import type { LlmConfigRow } from "./actions";

type Props = { llms: LlmConfigRow[] };

export function LlmAdminClient({ llms }: Props) {
  const [form, setForm] = useState<{ open: boolean; llm?: LlmConfigRow }>({ open: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">LLM Config</h1>
        <Button onClick={() => setForm({ open: true })}>+ Add Provider</Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Provider</th>
              <th className="px-4 py-3 text-left font-medium">Models</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {llms.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No LLM configs yet.
                </td>
              </tr>
            )}
            {llms.map((llm) => (
              <tr key={llm.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">
                  {llm.displayName}
                  {llm.isDefault && <Badge className="ml-2 text-xs" variant="secondary">default</Badge>}
                </td>
                <td className="px-4 py-3"><Badge variant="outline">{llm.provider}</Badge></td>
                <td className="px-4 py-3 text-muted-foreground">{llm.allowedModels.join(", ") || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={llm.enabled ? "default" : "secondary"}>
                    {llm.enabled ? "enabled" : "disabled"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => setForm({ open: true, llm })}>Edit</Button>
                  <form action={async () => { await deleteLlm(llm.id); }} style={{ display: "inline" }}>
                    <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">Delete</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LlmForm open={form.open} llm={form.llm} onClose={() => setForm({ open: false })} />
    </div>
  );
}
