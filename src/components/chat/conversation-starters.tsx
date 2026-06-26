"use client";

import { ArrowRight, ClipboardList, Layers3, MapPinned, RadioTower } from "@/components/ui/icons";

import { useAppPreferences } from "@/components/providers/app-preferences-provider";

type Props = {
  disabled?: boolean;
  onSelect: (prompt: string) => void | Promise<void>;
};

export function ConversationStarters({ disabled, onSelect }: Props) {
  const { t } = useAppPreferences();
  const defaultStarters = [
    {
      icon: ClipboardList,
      label: t("starters.workspace.label"),
      prompt: t("starters.workspace.prompt"),
    },
    {
      icon: MapPinned,
      label: t("starters.flow.label"),
      prompt: t("starters.flow.prompt"),
    },
    {
      icon: RadioTower,
      label: t("starters.diagnostics.label"),
      prompt: t("starters.diagnostics.prompt"),
    },
    {
      icon: Layers3,
      label: t("starters.example.label"),
      prompt: t("starters.example.prompt"),
    },
  ];
  const starters = defaultStarters;

  return (
    <section className="surface-panel surface-subtle rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">
          {t("starters.eyebrow")}
        </p>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-foreground sm:text-2xl">
          {t("starters.title")}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {t("starters.description")}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {starters.map((starter) => {
          const Icon = starter.icon;
          return (
            <button
              key={starter.prompt}
              type="button"
              disabled={disabled}
              onClick={() => void onSelect(starter.prompt)}
              className="group flex min-h-28 flex-col justify-between rounded-2xl border border-border/80 bg-background/80 p-4 text-left transition hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-primary-soft)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-[var(--color-primary)]">
                  <Icon className="size-4" />
                </div>
                <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{starter.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{starter.prompt}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
