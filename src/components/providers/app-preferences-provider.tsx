"use client";

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { translate, type AppLocale, type TranslationKey } from "@/lib/i18n";

export const LOCALE_STORAGE_KEY = "ai-chat-locale";

type AppPreferencesContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: TranslationKey) => string;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<AppLocale>("en");
  const [hasLoadedLocale, setHasLoadedLocale] = useState(false);

  useEffect(() => {
    try {
      const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (storedLocale === "pt-BR" || storedLocale === "en") {
        setLocale(storedLocale);
      }
    } catch {
      // Ignore storage failures.
    } finally {
      setHasLoadedLocale(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    if (!hasLoadedLocale) {
      return;
    }

    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore storage failures.
    }
  }, [hasLoadedLocale, locale]);

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => translate(locale, key),
    }),
    [locale],
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error("useAppPreferences must be used inside AppPreferencesProvider.");
  }
  return context;
}
