"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-helpers";
import { hashToken } from "@/lib/oauth-server";
import { prisma } from "@/lib/db";

const EXPIRY_OPTIONS: Record<string, number> = {
  "30d":  30,
  "90d":  90,
  "180d": 180,
  "365d": 365,
};

export type TokenRow = {
  id: string;
  name: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
};

export async function createToken(
  formData: FormData,
): Promise<{ rawToken: string; id: string }> {
  const user = await requireAuth();

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) throw new Error("Token name is required.");

  const expiryKey = (formData.get("expiry") as string | null) ?? "";
  const expiryDays = EXPIRY_OPTIONS[expiryKey];
  if (!expiryDays) throw new Error("Selecione um prazo de expiração.");

  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const existing = await prisma.personalToken.count({ where: { userId: user.id } });
  if (existing >= 10) throw new Error("Maximum of 10 tokens per user.");

  const rawToken = randomBytes(32).toString("hex");
  const record = await prisma.personalToken.create({
    data: { userId: user.id, name, tokenHash: hashToken(rawToken), expiresAt },
  });

  revalidatePath("/settings");
  return { rawToken, id: record.id };
}

export async function deleteToken(id: string): Promise<void> {
  const user = await requireAuth();
  await prisma.personalToken.deleteMany({
    where: { id, userId: user.id },
  });
  revalidatePath("/settings");
}
