"use server";

import AdmZip from "adm-zip";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export type ParsedSkill = {
  name: string;
  description: string;
  content: string;
};

function parseFrontmatter(raw: string): ParsedSkill {
  const trimmed = raw.trim();
  let name = "";
  let description = "";
  let content = trimmed;

  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(trimmed);
  if (fmMatch) {
    const yaml = fmMatch[1] ?? "";
    content = (fmMatch[2] ?? "").trim();
    for (const line of yaml.split(/\r?\n/)) {
      const [key, ...rest] = line.split(":");
      const val = rest.join(":").trim().replace(/^["']|["']$/g, "");
      if (key?.trim() === "name") name = val;
      if (key?.trim() === "description") description = val;
    }
  }

  return { name, description, content };
}

export async function parseSkillFile(formData: FormData): Promise<ParsedSkill> {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");

  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxBytes) throw new Error("File exceeds 5 MB limit.");

  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".md") || name.endsWith(".skill")) {
    return parseFrontmatter(buf.toString("utf8"));
  }

  if (name.endsWith(".zip")) {
    const zip = new AdmZip(buf);
    const entry =
      zip.getEntry("SKILL.md") ??
      zip.getEntries().find((e) => e.entryName.toLowerCase().endsWith(".md"));
    if (!entry) throw new Error("No .md file found inside the ZIP.");
    return parseFrontmatter(entry.getData().toString("utf8"));
  }

  throw new Error("Unsupported file type. Use .zip, .md, or .skill.");
}

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
