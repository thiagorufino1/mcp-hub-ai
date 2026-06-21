import { auth } from "@/lib/auth";
import { getUserContext } from "@/lib/user-context";
import {
  listAccessibleWorkspaces,
  resolveWorkspaceContext,
} from "@/lib/workspace-context";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  const [workspaces, workspaceContext, fallbackContext] = await Promise.all([
    listAccessibleWorkspaces(session.user.id, session.user.groups),
    workspaceId
      ? resolveWorkspaceContext(workspaceId, session.user.id, session.user.groups)
      : null,
    workspaceId
      ? null
      : getUserContext(session.user.groups, undefined, session.user.id),
  ]);
  if (workspaceId && !workspaceContext) {
    return Response.json({ error: "Workspace not found or access denied." }, { status: 404 });
  }
  const context = workspaceContext ?? fallbackContext!;

  return Response.json({
    allowedModels: context.allowedModels,
    hasCorporateLlm: context.llmConfig !== null,
    skills: context.skills.map((s) => ({
      description: s.description,
      id: s.id,
      name: s.name,
    })),
    starters: workspaceContext?.starters ?? [],
    workspaces,
  });
}
