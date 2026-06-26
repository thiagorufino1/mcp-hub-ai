import { auth } from "@/lib/auth";
import { getUserContext } from "@/lib/user-context";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getUserContext(session.user.groups, undefined, session.user.id);

  return Response.json({
    allowedModels: context.allowedModels,
    hasCorporateLlm: context.llmConfig !== null,
    starters: [],
  });
}
