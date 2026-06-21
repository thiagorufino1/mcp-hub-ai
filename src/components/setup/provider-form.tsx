// src/components/setup/provider-form.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LLMConfig } from "@/types/llm-config";

type ProviderType = LLMConfig["provider"];

type FieldValues = Record<string, string>;

type Props = {
  provider: ProviderType;
  values: FieldValues;
  onChange: (key: string, value: string) => void;
};

function Field({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[12px] font-medium text-[var(--color-text-primary)]">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[13px] shadow-none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  );
}

export function ProviderForm({ provider, values, onChange }: Props) {
  switch (provider) {
    case "openai":
      return (
        <div className="flex flex-col gap-3">
          <Field
            id="apiKey"
            label="API Key"
            type="password"
            value={values.apiKey ?? ""}
            onChange={(v) => onChange("apiKey", v)}
          />
          <Field
            id="model"
            label="Model"
            value={values.model ?? ""}
            onChange={(v) => onChange("model", v)}
          />
        </div>
      );

    case "azure":
      return (
        <div className="flex flex-col gap-3">
          <Field
            id="endpoint"
            label="Endpoint"
            value={values.endpoint ?? ""}
            onChange={(v) => onChange("endpoint", v)}
          />
          <Field
            id="apiKey"
            label="API Key"
            type="password"
            value={values.apiKey ?? ""}
            onChange={(v) => onChange("apiKey", v)}
          />
          <Field
            id="deployment"
            label="Deployment name"
            value={values.deployment ?? ""}
            onChange={(v) => onChange("deployment", v)}
          />
          <Field
            id="apiVersion"
            label="API Version"
            value={values.apiVersion ?? ""}
            onChange={(v) => onChange("apiVersion", v)}
          />
        </div>
      );

    case "google":
      return (
        <div className="flex flex-col gap-3">
          <Field
            id="apiKey"
            label="API Key"
            type="password"
            value={values.apiKey ?? ""}
            onChange={(v) => onChange("apiKey", v)}
          />
          <Field
            id="model"
            label="Model"
            value={values.model ?? ""}
            onChange={(v) => onChange("model", v)}
          />
        </div>
      );

    case "bedrock":
      return (
        <div className="flex flex-col gap-3">
          <Field
            id="accessKeyId"
            label="Access Key ID"
            value={values.accessKeyId ?? ""}
            onChange={(v) => onChange("accessKeyId", v)}
          />
          <Field
            id="secretKey"
            label="Secret Access Key"
            type="password"
            value={values.secretKey ?? ""}
            onChange={(v) => onChange("secretKey", v)}
          />
          <Field
            id="region"
            label="Region"
            value={values.region ?? ""}
            onChange={(v) => onChange("region", v)}
          />
          <Field
            id="modelId"
            label="Model ID"
            value={values.modelId ?? ""}
            onChange={(v) => onChange("modelId", v)}
          />
        </div>
      );

    case "ollama":
      return (
        <div className="flex flex-col gap-3">
          <Field
            id="baseUrl"
            label="Base URL"
            value={values.baseUrl ?? ""}
            onChange={(v) => onChange("baseUrl", v)}
          />
          <Field
            id="model"
            label="Model"
            value={values.model ?? ""}
            onChange={(v) => onChange("model", v)}
          />
        </div>
      );

    case "anthropic":
      return (
        <div className="flex flex-col gap-3">
          <Field id="apiKey" label="API Key" type="password" value={values.apiKey ?? ""} onChange={(v) => onChange("apiKey", v)} />
          <Field id="model" label="Model" placeholder="claude-sonnet-4-5" value={values.model ?? ""} onChange={(v) => onChange("model", v)} />
        </div>
      );

    case "groq":
      return (
        <div className="flex flex-col gap-3">
          <Field id="apiKey" label="API Key" type="password" value={values.apiKey ?? ""} onChange={(v) => onChange("apiKey", v)} />
          <Field id="model" label="Model" placeholder="llama-3.3-70b-versatile" value={values.model ?? ""} onChange={(v) => onChange("model", v)} />
        </div>
      );

    case "xai":
      return (
        <div className="flex flex-col gap-3">
          <Field id="apiKey" label="API Key" type="password" value={values.apiKey ?? ""} onChange={(v) => onChange("apiKey", v)} />
          <Field id="model" label="Model" placeholder="grok-2-latest" value={values.model ?? ""} onChange={(v) => onChange("model", v)} />
        </div>
      );

    case "mistral":
      return (
        <div className="flex flex-col gap-3">
          <Field id="apiKey" label="API Key" type="password" value={values.apiKey ?? ""} onChange={(v) => onChange("apiKey", v)} />
          <Field id="model" label="Model" placeholder="mistral-large-latest" value={values.model ?? ""} onChange={(v) => onChange("model", v)} />
        </div>
      );

    case "deepseek":
      return (
        <div className="flex flex-col gap-3">
          <Field id="apiKey" label="API Key" type="password" value={values.apiKey ?? ""} onChange={(v) => onChange("apiKey", v)} />
          <Field id="model" label="Model" placeholder="deepseek-chat" value={values.model ?? ""} onChange={(v) => onChange("model", v)} />
        </div>
      );
  }
}

export function buildLLMConfig(
  provider: ProviderType,
  values: FieldValues,
): LLMConfig | null {
  switch (provider) {
    case "openai":
      if (!values.apiKey || !values.model) return null;
      return { provider, apiKey: values.apiKey, model: values.model };
    case "azure":
      if (!values.endpoint || !values.apiKey || !values.deployment || !values.apiVersion)
        return null;
      return {
        provider,
        endpoint: values.endpoint,
        apiKey: values.apiKey,
        deployment: values.deployment,
        apiVersion: values.apiVersion,
      };
    case "google":
      if (!values.apiKey || !values.model) return null;
      return { provider, apiKey: values.apiKey, model: values.model };
    case "bedrock":
      if (!values.accessKeyId || !values.secretKey || !values.region || !values.modelId)
        return null;
      return {
        provider,
        accessKeyId: values.accessKeyId,
        secretKey: values.secretKey,
        region: values.region,
        modelId: values.modelId,
      };
    case "ollama":
      if (!values.baseUrl || !values.model) return null;
      return { provider, baseUrl: values.baseUrl, model: values.model };
    case "anthropic":
    case "groq":
    case "xai":
    case "mistral":
    case "deepseek":
      if (!values.apiKey || !values.model) return null;
      return { provider, apiKey: values.apiKey, model: values.model };
  }
}
