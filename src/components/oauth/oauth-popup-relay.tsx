"use client";

import { useEffect } from "react";

function postRelayMessage(payload: { code?: string; error?: string; state?: string }) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.opener?.postMessage(
      {
        type: "mcp-oauth-callback",
        ...payload,
      },
      window.location.origin,
    );
  } catch {
    // Ignore popup messaging failures.
  }
}

export function OAuthPopupRelay({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") ?? undefined;
    const error = params.get("error") ?? undefined;
    const state = params.get("state") ?? undefined;

    postRelayMessage({ code, error, state });
    const timer = window.setTimeout(() => {
      window.close();
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main style={{ maxWidth: 520, margin: "72px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{title}</h1>
      <p style={{ color: "#555", lineHeight: 1.6 }}>{description}</p>
    </main>
  );
}
