"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function OAuthCallbackContent() {
  const params = useSearchParams();

  useEffect(() => {
    const payload = {
      code: params.get("code") ?? undefined,
      error: params.get("error") ?? undefined,
      errorDescription: params.get("error_description") ?? undefined,
      state: params.get("state") ?? undefined,
      type: "mcp-oauth-callback",
    };

    window.opener?.postMessage(payload, window.location.origin);

    const timeoutId = window.setTimeout(() => {
      window.close();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [params]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="max-w-md rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-secondary)] shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
        Authentication complete. You can close this window.
      </div>
    </main>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)] px-6">
          <div className="max-w-md rounded-2xl border border-[#dbe4f1] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-secondary)] shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
            Authentication complete. You can close this window.
          </div>
        </main>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
