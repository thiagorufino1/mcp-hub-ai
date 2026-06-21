"use server";

import AdmZip from "adm-zip";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

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
    const entries = zip.getEntries();

    // Find SKILL.md (root preferred, else first .md found)
    const skillEntry =
      entries.find((e) => !e.isDirectory && e.name === "SKILL.md") ??
      entries.find((e) => !e.isDirectory && e.name.toLowerCase() === "skill.md") ??
      entries.find((e) => !e.isDirectory && e.entryName.toLowerCase().endsWith(".md"));

    if (!skillEntry) throw new Error("No SKILL.md file found inside the ZIP.");

    const parsed = parseFrontmatter(skillEntry.getData().toString("utf8"));

    // Text file extensions to embed as additional context
    const TEXT_EXTS = new Set([
      ".md", ".txt", ".js", ".ts", ".jsx", ".tsx", ".py", ".sh", ".bash",
      ".json", ".yaml", ".yml", ".toml", ".xml", ".html", ".css", ".sql",
      ".env", ".ini", ".cfg", ".conf", ".rs", ".go", ".java", ".rb", ".php",
    ]);

    const MAX_FILE_BYTES = 512 * 1024; // 512 KB per file

    const otherEntries = entries.filter((e) => {
      if (e.isDirectory) return false;
      if (e.entryName === skillEntry.entryName) return false;
      const ext = e.name.includes(".") ? "." + e.name.split(".").pop()!.toLowerCase() : "";
      return TEXT_EXTS.has(ext) && e.header.size <= MAX_FILE_BYTES;
    });

    if (otherEntries.length === 0) return parsed;

    const embedded = otherEntries
      .sort((a, b) => a.entryName.localeCompare(b.entryName))
      .map((e) => {
        const ext = e.name.includes(".") ? e.name.split(".").pop()!.toLowerCase() : "";
        const fileContent = e.getData().toString("utf8");
        return `\n\n### ${e.entryName}\n\`\`\`${ext}\n${fileContent}\n\`\`\``;
      })
      .join("");

    return {
      ...parsed,
      content: parsed.content + "\n\n---\n\n## Included files" + embedded,
    };
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
  const user = await requireAdmin();
  const skill = await prisma.skill.create({
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string | null) || null,
      content: formData.get("content") as string,
      enabled: formData.get("enabled") === "true",
    },
  });
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "skill.create", resource: "Skill", resourceId: skill.id, metadata: { name: skill.name } });
  revalidatePath("/admin/skills");
}

export async function updateSkill(id: string, formData: FormData): Promise<void> {
  const user = await requireAdmin();
  await prisma.skill.update({
    where: { id },
    data: {
      name: formData.get("name") as string,
      description: (formData.get("description") as string | null) || null,
      content: formData.get("content") as string,
      enabled: formData.get("enabled") === "true",
    },
  });
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "skill.update", resource: "Skill", resourceId: id, metadata: { name: formData.get("name") as string } });
  revalidatePath("/admin/skills");
}

export async function deleteSkill(id: string): Promise<void> {
  const user = await requireAdmin();
  await prisma.skill.delete({ where: { id } });
  logAudit({ userId: user.id, userEmail: user.email ?? undefined, action: "skill.delete", resource: "Skill", resourceId: id });
  revalidatePath("/admin/skills");
}
