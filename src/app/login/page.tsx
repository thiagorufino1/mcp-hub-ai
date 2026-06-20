import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Login — MCP Hub" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">MCP Hub</h1>
        <p className="text-sm text-muted-foreground">Sign in to continue</p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("microsoft-entra-id", { redirectTo: "/chat" });
        }}
      >
        <Button type="submit" size="lg" className="gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 21 21"
            aria-hidden="true"
          >
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          Sign in with Microsoft
        </Button>
      </form>
    </div>
  );
}
