import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Login - MCP Hub" };

export default function LoginPage() {
  return (
    <div className="login-shell">
      <div className="login-brand">
        <p className="text-[24px] font-semibold tracking-[-0.05em] text-white">
          MCP <span className="text-white/70">Hub</span>
        </p>
        <p className="max-w-xl text-balance text-center text-sm leading-6 text-white/72">
          Corporate AI workspace with governed models, agents and MCP tools.
        </p>
      </div>
      <div className="login-panel">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M12 3 4 7v5c0 4.8 3.4 8.1 8 9 4.6-.9 8-4.2 8-9V7l-8-4Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in with your corporate Microsoft account.</p>
        </div>
        <form action={async () => {
          "use server";
          await signIn("microsoft-entra-id", { redirectTo: "/" });
        }} className="w-full">
          <Button type="submit" size="lg" className="w-full rounded-xl">
            <MicrosoftMark />
            Sign in with Microsoft
          </Button>
        </form>
        <p className="text-center text-xs leading-5 text-muted-foreground">
          Access is controlled by your Microsoft Entra ID groups.
        </p>
      </div>
    </div>
  );
}

function MicrosoftMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
