import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const DisconnectSchema = z.object({ mcpServerId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = DisconnectSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  await prisma.userMcpConnection.deleteMany({
    where: { userId: session.user.id, mcpServerId: body.data.mcpServerId },
  });

  return Response.json({ ok: true });
}
