import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r bg-muted/40 p-4 gap-1">
        <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Admin
        </p>
        <nav className="flex flex-col gap-1 flex-1">
          <Link
            href="/admin"
            className="rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/mcp"
            className="rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            MCP Servers
          </Link>
          <Link
            href="/admin/llm"
            className="rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            LLM Config
          </Link>
          <Link
            href="/admin/skills"
            className="rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Skills
          </Link>
          <Link
            href="/admin/groups"
            className="rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Groups
          </Link>
        </nav>
        <div className="border-t pt-3 mt-auto flex flex-col gap-2">
          <Link
            href="/chat"
            className="rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            ← Back to Chat
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start px-3">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
