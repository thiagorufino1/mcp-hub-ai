import { requireAuth } from "@/lib/auth-helpers";
import { ChatShell } from "@/components/chat/chat-shell";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const [user, params] = await Promise.all([requireAuth(), searchParams]);
  return (
    <ChatShell
      isAdmin={user.isAdmin}
      userName={user.name}
      initialWorkspaceId={params.w ?? null}
    />
  );
}
