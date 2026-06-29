import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

export async function getCurrentUser(): Promise<Session["user"] | null> {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth(): Promise<Session["user"]> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<Session["user"]> {
  const user = await requireAuth();
  if (!user.isAdmin) redirect("/chat");
  return user;
}
