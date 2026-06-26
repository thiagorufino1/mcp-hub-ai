"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyAuthorizeState } from "@/lib/oauth-server-state";
import { createAuthCode } from "@/lib/oauth-server";

export async function approveOAuth(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const hubState = formData.get("hub_state") as string;
  const codeChallenge = formData.get("code_challenge") as string;
  const originalState = formData.get("original_state") as string;

  const statePayload = verifyAuthorizeState(hubState);
  if (!statePayload) redirect("/oauth/error?error=invalid_state");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login");

  const rawCode = await createAuthCode({
    clientId: statePayload.clientId,
    userId: user.id,
    redirectUri: statePayload.redirectUri,
    scope: statePayload.scope,
    codeChallenge,
  });

  const target = new URL(statePayload.redirectUri);
  target.searchParams.set("code", rawCode);
  if (originalState) target.searchParams.set("state", originalState);

  redirect(target.toString());
}

export async function denyOAuth(formData: FormData) {
  const hubState = formData.get("hub_state") as string;
  const originalState = formData.get("original_state") as string;

  const statePayload = verifyAuthorizeState(hubState);
  if (!statePayload) redirect("/oauth/error?error=invalid_state");

  const target = new URL(statePayload.redirectUri);
  target.searchParams.set("error", "access_denied");
  if (originalState) target.searchParams.set("state", originalState);

  redirect(target.toString());
}
