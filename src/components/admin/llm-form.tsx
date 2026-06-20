"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LlmConfigRow } from "@/app/admin/llm/actions";
import { createLlm, updateLlm } from "@/app/admin/llm/actions";

const PROVIDERS = [
  "openai", "anthropic", "google", "azure", "bedrock",
  "ollama", "groq", "xai", "mistral", "deepseek",
];

type Props = { open: boolean; onClose: () => void; llm?: LlmConfigRow };

export function LlmForm({ open, onClose, llm }: Props) {
  const [provider, setProvider] = useState(llm?.provider ?? "openai");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (llm) {
          await updateLlm(llm.id, formData);
        } else {
          await createLlm(formData);
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  const creds = llm?.credentials ?? {};

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{llm ? "Edit LLM Config" : "Add LLM Config"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input id="displayName" name="displayName" defaultValue={llm?.displayName} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="provider">Provider *</Label>
            <select
              id="provider"
              name="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {provider === "azure" ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="endpoint">Azure Endpoint *</Label>
                <Input id="endpoint" name="endpoint" defaultValue={creds["endpoint"]} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="apiKey">API Key *</Label>
                <Input id="apiKey" name="apiKey" type="password" defaultValue={creds["apiKey"]} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="deployment">Deployment Name *</Label>
                <Input id="deployment" name="deployment" defaultValue={creds["deployment"]} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="apiVersion">API Version</Label>
                <Input id="apiVersion" name="apiVersion" defaultValue={creds["apiVersion"] ?? "2024-02-01"} />
              </div>
            </>
          ) : provider === "bedrock" ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="accessKeyId">Access Key ID *</Label>
                <Input id="accessKeyId" name="accessKeyId" defaultValue={creds["accessKeyId"]} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="secretKey">Secret Key *</Label>
                <Input id="secretKey" name="secretKey" type="password" defaultValue={creds["secretKey"]} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="region">Region *</Label>
                <Input id="region" name="region" defaultValue={creds["region"] ?? "us-east-1"} required />
              </div>
            </>
          ) : provider === "ollama" ? (
            <div className="space-y-1">
              <Label htmlFor="baseUrl">Base URL *</Label>
              <Input id="baseUrl" name="baseUrl" defaultValue={creds["baseUrl"] ?? "http://localhost:11434"} required />
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input id="apiKey" name="apiKey" type="password" defaultValue={creds["apiKey"]} />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="allowedModels">Allowed Models (one per line) *</Label>
            <textarea
              id="allowedModels"
              name="allowedModels"
              defaultValue={llm?.allowedModels.join("\n") ?? ""}
              rows={4}
              required
              placeholder={"gpt-4o\ngpt-4o-mini"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input name="enabled" type="checkbox" value="true" defaultChecked={llm?.enabled ?? true} className="h-4 w-4 rounded" />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="isDefault" type="checkbox" value="true" defaultChecked={llm?.isDefault ?? false} className="h-4 w-4 rounded" />
              Default provider
            </label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
