// src/components/providers/app-providers.tsx
"use client";

import type { PropsWithChildren } from "react";

import { AppPreferencesProvider } from "@/components/providers/app-preferences-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <AppPreferencesProvider>{children}</AppPreferencesProvider>
    </ThemeProvider>
  );
}
