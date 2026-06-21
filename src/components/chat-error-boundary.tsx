"use client";

import { Component, type ReactNode } from "react";

import { translate, type AppLocale, type TranslationKey } from "@/lib/i18n";
import { LOCALE_STORAGE_KEY } from "@/components/providers/app-preferences-provider";

function getLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored === "pt-BR" || stored === "en" ? stored : "en";
  } catch {
    return "en";
  }
}

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      const locale = getLocale();
      const t = (key: TranslationKey) => translate(locale, key);
      return (
        <div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
          <div className="max-w-md rounded-2xl border border-[var(--color-error)] bg-[var(--color-error-soft)] p-8 text-center">
            <p className="text-lg font-semibold text-[var(--color-error)]">{t("error.title")}</p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {this.state.error.message}
            </p>
            <button
              className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)]"
              onClick={() => this.setState({ error: null })}
              type="button"
            >
              {t("error.retry")}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
