import type { Metadata } from "next";

import { ChatErrorBoundary } from "@/components/chat-error-boundary";
import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "MCP Hub",
  description: "Local web UI for testing MCP servers and LLMs.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="pt-BR" suppressHydrationWarning>
      <body>
        <AppProviders>
          <ChatErrorBoundary>{children}</ChatErrorBoundary>
        </AppProviders>
      </body>
    </html>
  );
}
