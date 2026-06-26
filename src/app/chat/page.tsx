import { requireAuth } from "@/lib/auth-helpers";
import { ChatShell } from "@/components/chat/chat-shell";

export default async function ChatPage() {
  const user = await requireAuth();
  return (
    <ChatShell
      isAdmin={user.isAdmin}
      userName={user.name}
      userImage={user.image ?? null}
    />
  );
}
