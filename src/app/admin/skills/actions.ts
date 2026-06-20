"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export type SkillRow = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  enabled: boolean;
};

export async function createSkill(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.skill.create({
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string | null) || null,
      content: formData.get("content") as string,
      enabled: formData.get("enabled") === "true",
    },
  });
  revalidatePath("/admin/skills");
}

export async function updateSkill(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.skill.update({
    where: { id },
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string | null) || null,
      content: formData.get("content") as string,
      enabled: formData.get("enabled") === "true",
    },
  });
  revalidatePath("/admin/skills");
}

export async function deleteSkill(id: string): Promise<void> {
  await requireAdmin();
  await prisma.skill.delete({ where: { id } });
  revalidatePath("/admin/skills");
}
