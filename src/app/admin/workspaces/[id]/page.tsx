import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

import { WorkspaceDetailClient } from "./client";

export const metadata: Metadata = {
  title: "Workspace details — Admin",
};

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [workspace, groups, skills, llms, namespaces] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        systemPrompt: true,
        model: true,
        maxSteps: true,
        approvalMode: true,
        conversationStarters: true,
        enabled: true,
        isDefault: true,
        llmConfigId: true,
        namespaceId: true,
        createdAt: true,
        updatedAt: true,
        llmConfig: {
          select: {
            id: true,
            displayName: true,
            provider: true,
            allowedModels: true,
            lastTestAt: true,
            lastTestStatus: true,
          },
        },
        namespace: {
          select: {
            id: true,
            name: true,
            alias: true,
            enabled: true,
            _count: {
              select: {
                servers: { where: { enabled: true } },
                tools: { where: { enabled: true } },
              },
            },
          },
        },
        skills: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, description: true, enabled: true },
        },
        groups: {
          orderBy: { displayName: "asc" },
          select: {
            id: true,
            displayName: true,
            entraGroupId: true,
            memberCount: true,
            isActive: true,
          },
        },
        users: { select: { id: true } },
      },
    }),
    prisma.entraGroup.findMany({
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        displayName: true,
        entraGroupId: true,
        memberCount: true,
        isActive: true,
      },
    }),
    prisma.skill.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
    prisma.llmConfig.findMany({
      where: { enabled: true },
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        displayName: true,
        provider: true,
        allowedModels: true,
        lastTestAt: true,
        lastTestStatus: true,
      },
    }),
    prisma.mcpNamespace.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, alias: true },
    }),
  ]);

  if (!workspace) notFound();

  return (
    <WorkspaceDetailClient
      workspace={{
        ...workspace,
        allUsers: workspace.groups.length === 0 && workspace.users.length === 0,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      }}
      groups={groups}
      skills={skills}
      llms={llms}
      namespaces={namespaces}
    />
  );
}
