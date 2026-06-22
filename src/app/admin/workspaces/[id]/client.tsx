"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { syncAllGroups } from "@/app/admin/groups/actions";
import { testLlmConfig } from "@/app/admin/llm/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProviderLogo } from "@/components/setup/provider-logo";
import {
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers3,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { LLMConfig } from "@/types/llm-config";
import { cn } from "@/lib/utils";

import {
  addWorkspaceGroup,
  addWorkspaceSkill,
  deleteWorkspaceGroup,
  deleteWorkspaceSkill,
  deleteWorkspace,
  setWorkspaceAllUsers,
  updateWorkspaceBasics,
  updateWorkspaceLlm,
  updateWorkspaceNamespace,
  updateWorkspaceSystemPrompt,
  updateWorkspaceSettings,
} from "./actions";

type Group = {
  id: string;
  displayName: string;
  entraGroupId: string;
  memberCount: number;
  isActive: boolean;
};

type Skill = { id: string; name: string; description: string | null };
type Llm = {
  id: string;
  displayName: string;
  provider: string;
  allowedModels: string[];
  lastTestAt: Date | null;
  lastTestStatus: string;
};

type Workspace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  systemPrompt: string | null;
  model: string | null;
  approvalMode: string;
  conversationStarters: string[];
  enabled: boolean;
  isDefault: boolean;
  llmConfigId: string | null;
  namespaceId: string | null;
  createdAt: string;
  updatedAt: string;
  allUsers: boolean;
  llmConfig: Llm | null;
  namespace: {
    id: string;
    name: string;
    alias: string;
    enabled: boolean;
    _count: { servers: number; tools: number };
  } | null;
  skills: Array<Skill & { enabled: boolean }>;
  groups: Group[];
};

export function WorkspaceDetailClient({
  workspace,
  groups,
  skills,
  llms,
  namespaces,
}: {
  workspace: Workspace;
  groups: Group[];
  skills: Skill[];
  llms: Llm[];
  namespaces: Array<{ id: string; name: string; alias: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [systemPromptOpen, setSystemPromptOpen] = useState(false);
  const [llmOpen, setLlmOpen] = useState(false);
  const [namespaceOpen, setNamespaceOpen] = useState(false);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [llmStatus, setLlmStatus] = useState(workspace.llmConfig?.lastTestStatus ?? "not_tested");
  const [llmLastTestAt, setLlmLastTestAt] = useState<Date | null>(
    workspace.llmConfig?.lastTestAt ?? null,
  );
  const [llmTesting, startLlmTesting] = useTransition();
  const [enabled, setEnabled] = useState(workspace.enabled);
  const [isDefault, setIsDefault] = useState(workspace.isDefault);
  const [allUsers, setAllUsers] = useState(workspace.allUsers);

  const availableSkills = skills.filter(
    (skill) => !workspace.skills.some((assigned) => assigned.id === skill.id),
  );
  const availableGroups = groups.filter(
    (group) => !workspace.groups.some((assigned) => assigned.id === group.id),
  );
  const visibleSkills = useMemo(() => {
    const query = skillSearch.trim().toLowerCase();
    return workspace.skills.filter((skill) =>
      [skill.name, skill.description ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [skillSearch, workspace.skills]);
  const visibleGroups = useMemo(() => {
    const query = groupSearch.trim().toLowerCase();
    return workspace.groups.filter((group) =>
      [group.displayName, group.entraGroupId].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [groupSearch, workspace.groups]);

  function run(action: () => Promise<void>, fallback: string) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : fallback);
      }
    });
  }

  function syncLlm() {
    if (!workspace.llmConfigId) return;
    setError(null);
    startLlmTesting(async () => {
      try {
        const result = await testLlmConfig(workspace.llmConfigId as string);
        setLlmStatus(result.ok ? "connected" : "error");
        setLlmLastTestAt(new Date());
        if (!result.ok) setError(result.error ?? "Could not test LLM configuration.");
        router.refresh();
      } catch (cause) {
        setLlmStatus("error");
        setError(cause instanceof Error ? cause.message : "Could not test LLM configuration.");
      }
    });
  }

  function removeWorkspace() {
    if (!window.confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteWorkspace(workspace.id);
        router.push("/admin/workspaces");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not delete workspace.");
      }
    });
  }

  return (
    <div className="portal-page max-w-6xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Link
          href="/admin/workspaces"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-[var(--color-primary)]"
        >
          <ArrowRight aria-hidden="true" className="size-4 rotate-180" />
          Back to Workspaces
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={workspace.enabled ? "success" : "secondary"}>
            {workspace.enabled ? "Enabled" : "Disabled"}
          </Badge>
          {workspace.isDefault ? <Badge variant="info">Default</Badge> : null}
        </div>
      </div>

      <div className="portal-page-heading flex-row items-start justify-between gap-5">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{workspace.name}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Alias: /{workspace.slug}
          </p>
          <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-secondary)]">
            {workspace.description || "No description configured."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            className="size-9 rounded-full"
            onClick={() => setEditOpen(true)}
            aria-label="Edit workspace basics"
          >
            <PencilLine aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-9 rounded-full border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]"
            onClick={removeWorkspace}
            disabled={pending}
            aria-label="Delete workspace"
            title="Delete workspace"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-[var(--color-error)] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Skills" value={String(workspace.skills.length)} tone="info" />
        <KpiCard
          label="MCP Servers"
          value={String(workspace.namespace?._count.servers ?? 0)}
          tone="success"
        />
        <KpiCard
          label="Tools"
          value={String(workspace.namespace?._count.tools ?? 0)}
          tone="success"
        />
        <KpiCard
          label="Access"
          value={allUsers ? "All users" : String(workspace.groups.length)}
          tone="neutral"
        />
      </div>

      <section className={sectionClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">System prompt</h2>
            <p className="text-sm text-muted-foreground">Prompt used during execution.</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-9 rounded-full"
            onClick={() => setSystemPromptOpen(true)}
            aria-label="Edit system prompt"
            title="Edit system prompt"
          >
            <PencilLine aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="bg-[var(--color-surface-muted)]/20 px-4 py-4">
            <p className="max-w-4xl whitespace-pre-wrap font-mono text-sm leading-7 text-[var(--color-text-secondary)]">
              {workspace.systemPrompt || "No system prompt configured."}
            </p>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">LLM</h2>
            <p className="text-sm text-muted-foreground">
            Bound model provider and allowed models for this workspace.
          </p>
        </div>
        </div>
        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[26%]" />
              <col className="w-[16%]" />
              <col className="w-[22%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-center">Model</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Last sync</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/55">
                <td className="px-4 py-4 align-middle">
                  <div className="flex items-center gap-3">
                    <ProviderLogo
                      provider={workspace.llmConfig?.provider as LLMConfig["provider"]}
                      flat
                      className="size-10 shrink-0 rounded-xl"
                      iconClassName="size-5"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-text-secondary)]">
                        {workspace.llmConfig?.displayName ?? "Not configured"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center align-middle">
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {workspace.model || workspace.llmConfig?.allowedModels[0] || "Not configured"}
                  </p>
                </td>
                <td className="px-4 py-4 text-center align-middle">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      llmStatus === "connected" &&
                        "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]",
                      llmStatus === "error" &&
                        "border-[var(--color-error)] bg-[var(--color-error-soft)] text-[var(--color-error)]",
                      llmStatus !== "connected" &&
                        llmStatus !== "error" &&
                        "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-muted-foreground",
                    )}
                  >
                    {llmTesting ? <LoaderCircle className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                    {llmTesting
                      ? "Validating"
                      : llmStatus === "connected"
                        ? "Connected"
                        : llmStatus === "error"
                          ? "Error"
                          : "Not tested"}
                  </span>
                </td>
                <td className="px-4 py-4 text-center align-middle">
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar aria-hidden="true" className="size-3.5" />
                    <span>
                      {llmLastTestAt
                        ? new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(llmLastTestAt)
                        : "Never"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center align-middle">
                  <div className="flex justify-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0 rounded-full"
                      onClick={() => syncLlm()}
                      disabled={llmTesting || !workspace.llmConfigId}
                      aria-label="Sync LLM status"
                      title="Sync LLM status"
                    >
                      {llmTesting ? <LoaderCircle className="animate-spin" /> : <RefreshCw aria-hidden="true" className="size-4" />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0 rounded-full"
                      onClick={() => setLlmOpen(true)}
                      aria-label="Edit workspace LLM"
                    >
                      <PencilLine aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Namespace</h2>
            <p className="text-sm text-muted-foreground">
              Assign the namespace used by this workspace.
            </p>
          </div>
        </div>
        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-4 py-3">Namespace</th>
                <th className="px-4 py-3 text-center">MCP Servers</th>
                <th className="px-4 py-3 text-center">Tools</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {workspace.namespace ? (
                <tr className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/55">
                  <td className="px-4 py-4 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
                        <Layers3 aria-hidden="true" className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/namespaces/${workspace.namespace.id}`}
                          className="font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)] hover:underline"
                        >
                          {workspace.namespace.name}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">
                          Alias: /{workspace.namespace.alias}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center align-middle">
                    <span className="inline-flex min-w-10 justify-center font-medium text-[var(--color-text-secondary)]">
                      {workspace.namespace._count.servers}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center align-middle">
                    <span className="inline-flex min-w-10 justify-center font-medium text-[var(--color-text-secondary)]">
                      {workspace.namespace._count.tools}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center align-middle">
                    <Badge variant={workspace.namespace.enabled ? "success" : "secondary"}>
                      {workspace.namespace.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-center align-middle">
                    <div className="flex justify-center gap-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 shrink-0 rounded-full"
                        onClick={() => setNamespaceOpen(true)}
                        aria-label="Edit workspace namespace"
                      >
                        <PencilLine aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 shrink-0 rounded-full"
                        onClick={() => router.refresh()}
                        aria-label="Refresh namespace details"
                      >
                        <RefreshCw aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr className="border-t border-[var(--color-border)]">
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No namespace assigned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeader
          title="Skills"
          description="Skills available to this workspace."
          search={skillSearch}
          setSearch={setSkillSearch}
          placeholder="Search skills..."
          onAdd={() => {
            setSelectedSkillIds([]);
            setAddSkillOpen(true);
          }}
        />
        <div className="portal-table-shell overflow-x-auto">
          <table className="w-full min-w-[940px] table-fixed text-left text-sm text-[var(--color-text-secondary)]">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[42%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-4 py-3">Skill</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleSkills.length ? visibleSkills.map((skill) => (
                <tr key={skill.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/55">
                  <td className="px-4 py-4 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]">
                        <Sparkles className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{skill.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {skill.description || "No description."}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-center align-middle">
                    <Badge variant={skill.enabled ? "success" : "secondary"}>
                      {skill.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-center align-middle">
                    <DeleteButton
                      label={`Remove ${skill.name}`}
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => deleteWorkspaceSkill(workspace.id, skill.id),
                          "Could not remove skill.",
                        )
                      }
                    />
                  </td>
                </tr>
              )) : <EmptyRow columns={4} text="No skills match this search." />}
            </tbody>
          </table>
        </div>
        <p className="text-right text-xs text-muted-foreground">{workspace.skills.length} skills assigned</p>
      </section>

      <section className={sectionClass}>
        <div>
          <h2 className="text-base font-semibold">Access control</h2>
          <p className="text-sm text-muted-foreground">Manage which groups can use this workspace.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3">
          <Switch
            checked={allUsers}
            disabled={pending}
            onCheckedChange={(checked) => {
              setAllUsers(checked);
              if (checked) run(() => setWorkspaceAllUsers(workspace.id, true), "Could not update access.");
            }}
          />
          <div>
            <p className="text-sm font-semibold">Available to all authenticated users</p>
            <p className="text-xs text-muted-foreground">When enabled, group-based access is removed.</p>
          </div>
        </div>
        {!allUsers ? (
          <div className="rounded-2xl border border-[var(--color-border)] p-4">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div><h3 className="font-medium">Groups</h3><p className="text-sm text-muted-foreground">Entra groups assigned to this workspace.</p></div>
              <div className="flex w-full max-w-lg gap-2">
                <SearchBox value={groupSearch} onChange={setGroupSearch} placeholder="Search groups..." />
                <Button variant="outline" disabled={pending} onClick={() => run(async () => { await syncAllGroups(); }, "Could not sync groups.")}><RefreshCw className="mr-2 size-4" />Sync groups</Button>
                <Button size="icon" variant="outline" className="size-10 rounded-full" onClick={() => { setSelectedGroupIds([]); setAddGroupOpen(true); }} aria-label="Add groups"><Plus /></Button>
              </div>
            </div>
            <div className="portal-table-shell overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead><tr><th className="px-4 py-3">Entra Object ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3 text-center">Members</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
                <tbody>{visibleGroups.length ? visibleGroups.map((group) => (
                  <tr key={group.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]/55">
                    <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{group.entraGroupId}</td>
                    <td className="px-4 py-4 font-medium">{group.displayName}</td>
                    <td className="px-4 py-4 text-center">{group.memberCount}</td>
                    <td className="px-4 py-4 text-center"><Badge variant={group.isActive ? "success" : "error"}>{group.isActive ? "Active" : "Inactive"}</Badge></td>
                    <td className="px-4 py-4 text-center"><DeleteButton label={`Remove ${group.displayName}`} disabled={pending} onClick={() => run(() => deleteWorkspaceGroup(workspace.id, group.id), "Could not remove group.")} /></td>
                  </tr>
                )) : <EmptyRow columns={5} text="No groups match this search." />}</tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className={sectionClass}>
        <div><h2 className="text-base font-semibold">Settings</h2><p className="text-sm text-muted-foreground">Workspace availability and default selection.</p></div>
        <div className="grid gap-3 md:grid-cols-2">
          <SettingToggle
            title="Enabled"
            description="Make this workspace available."
            checked={enabled}
            onChange={(value) => {
              setEnabled(value);
              if (!value) setIsDefault(false);
            }}
          />
          <SettingToggle
            title="Default workspace"
            description="Use this workspace as the default experience."
            checked={isDefault}
            onChange={setIsDefault}
            disabled={!enabled}
          />
        </div>
      </section>
      <div className="flex justify-end">
        <Button
          disabled={pending}
          onClick={() =>
            run(
              () => updateWorkspaceSettings(workspace.id, { enabled, isDefault: enabled ? isDefault : false }),
              "Could not save settings.",
            )
          }
        >
          {pending ? "Saving..." : "Save settings"}
        </Button>
      </div>

      <BasicsDialog workspace={workspace} open={editOpen} setOpen={setEditOpen} run={run} />
      <SystemPromptDialog workspace={workspace} open={systemPromptOpen} setOpen={setSystemPromptOpen} run={run} />
      <LlmDialog workspace={workspace} llms={llms} open={llmOpen} setOpen={setLlmOpen} run={run} />
      <NamespaceDialog workspace={workspace} namespaces={namespaces} open={namespaceOpen} setOpen={setNamespaceOpen} run={run} />
      <SelectionDialog title="Add skills" open={addSkillOpen} setOpen={setAddSkillOpen} items={availableSkills.map((item) => ({ id: item.id, title: item.name, subtitle: item.description }))} selected={selectedSkillIds} setSelected={setSelectedSkillIds} onAdd={async () => { for (const id of selectedSkillIds) await addWorkspaceSkill(workspace.id, id); }} run={run} />
      <SelectionDialog title="Add groups" open={addGroupOpen} setOpen={setAddGroupOpen} items={availableGroups.map((item) => ({ id: item.id, title: item.displayName, subtitle: item.entraGroupId }))} selected={selectedGroupIds} setSelected={setSelectedGroupIds} onAdd={async () => { for (const id of selectedGroupIds) await addWorkspaceGroup(workspace.id, id); }} run={run} />
    </div>
  );
}

const sectionClass = "flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(17,63,124,0.04)]";

function KpiCard({ label, value, tone }: { label: string; value: string; tone: "info" | "success" | "neutral" }) {
  const color = tone === "success" ? "text-[var(--color-success)]" : tone === "info" ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]";
  return <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p></div>;
}

function InfoCard({ label, value, detail, href }: { label: string; value: string; detail?: string; href?: string }) {
  const content = <><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 font-medium">{value}</p>{detail ? <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p> : null}</>;
  return href ? <Link href={href} className="rounded-xl border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-surface-muted)]/55">{content}</Link> : <div className="rounded-xl border border-[var(--color-border)] p-4">{content}</div>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" /></div>;
}

function SectionHeader({ title, description, search, setSearch, placeholder, onAdd }: { title: string; description: string; search: string; setSearch: (value: string) => void; placeholder: string; onAdd: () => void }) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-base font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div><div className="flex w-full max-w-sm gap-2"><SearchBox value={search} onChange={setSearch} placeholder={placeholder} /><Button size="icon" variant="outline" className="size-10 rounded-full" onClick={onAdd}><Plus /></Button></div></div>;
}

function DeleteButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return <Button type="button" variant="ghost" size="icon" className="rounded-full text-[var(--color-error)] hover:bg-[var(--color-error-soft)] hover:text-[var(--color-error)]" aria-label={label} disabled={disabled} onClick={onClick}><Trash2 className="size-4" /></Button>;
}

function EmptyRow({ columns, text }: { columns: number; text: string }) {
  return <tr><td colSpan={columns} className="px-4 py-10 text-center text-muted-foreground">{text}</td></tr>;
}

function SettingToggle({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] px-4 py-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function BasicsDialog({ workspace, open, setOpen, run }: { workspace: Workspace; open: boolean; setOpen: (open: boolean) => void; run: (action: () => Promise<void>, fallback: string) => void }) {
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl rounded-2xl"><DialogHeader><DialogTitle>Edit workspace</DialogTitle></DialogHeader><form action={(formData) => { run(() => updateWorkspaceBasics(workspace.id, { name: String(formData.get("name") ?? ""), slug: String(formData.get("slug") ?? ""), description: String(formData.get("description") ?? "") || null }), "Could not update workspace."); setOpen(false); }} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="workspace-name">Name</Label><Input id="workspace-name" name="name" defaultValue={workspace.name} required /></div><div className="space-y-1.5"><Label htmlFor="workspace-alias">Alias</Label><Input id="workspace-alias" name="slug" defaultValue={workspace.slug} required /></div></div><div className="space-y-1.5"><Label htmlFor="workspace-description">Description</Label><Textarea id="workspace-description" name="description" defaultValue={workspace.description ?? ""} rows={3} /></div><DialogFooter><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save</Button></DialogFooter></form></DialogContent></Dialog>;
}

function SystemPromptDialog({ workspace, open, setOpen, run }: { workspace: Workspace; open: boolean; setOpen: (open: boolean) => void; run: (action: () => Promise<void>, fallback: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit system prompt</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            run(
              () => updateWorkspaceSystemPrompt(workspace.id, String(formData.get("systemPrompt") ?? "") || null),
              "Could not update system prompt.",
            );
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="workspace-prompt">System prompt</Label>
            <Textarea id="workspace-prompt" name="systemPrompt" rows={8} defaultValue={workspace.systemPrompt ?? ""} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LlmDialog({
  workspace,
  llms,
  open,
  setOpen,
  run,
}: {
  workspace: Workspace;
  llms: Llm[];
  open: boolean;
  setOpen: (open: boolean) => void;
  run: (action: () => Promise<void>, fallback: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit LLM</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            run(
              () =>
                updateWorkspaceLlm(workspace.id, {
                  llmConfigId: String(formData.get("llmConfigId") ?? "") || null,
                }),
              "Could not update LLM.",
            );
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="LLM configuration"
              name="llmConfigId"
              defaultValue={workspace.llmConfigId ?? ""}
              options={llms.map((item) => ({ value: item.id, label: item.displayName }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NamespaceDialog({
  workspace,
  namespaces,
  open,
  setOpen,
  run,
}: {
  workspace: Workspace;
  namespaces: Array<{ id: string; name: string; alias: string }>;
  open: boolean;
  setOpen: (open: boolean) => void;
  run: (action: () => Promise<void>, fallback: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit namespace</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            run(
              () => updateWorkspaceNamespace(workspace.id, String(formData.get("namespaceId") ?? "") || null),
              "Could not update namespace.",
            );
            setOpen(false);
          }}
          className="space-y-4"
        >
          <SelectField
            label="Namespace"
            name="namespaceId"
            defaultValue={workspace.namespaceId ?? ""}
            options={namespaces.map((item) => ({ value: item.id, label: item.name }))}
            includeEmptyOption={false}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  includeEmptyOption = true,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
  includeEmptyOption?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
      >
        {includeEmptyOption ? <option value="">Automatic / none</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SelectionDialog({ title, open, setOpen, items, selected, setSelected, onAdd, run }: { title: string; open: boolean; setOpen: (open: boolean) => void; items: Array<{ id: string; title: string; subtitle: string | null }>; selected: string[]; setSelected: (ids: string[]) => void; onAdd: () => Promise<void>; run: (action: () => Promise<void>, fallback: string) => void }) {
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl rounded-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><div className="max-h-[55vh] space-y-2 overflow-y-auto">{items.length ? items.map((item) => <label key={item.id} className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3"><input type="checkbox" className="mt-1 size-4 accent-[var(--color-primary)]" checked={selected.includes(item.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} /><span><span className="block text-sm font-medium">{item.title}</span>{item.subtitle ? <span className="block text-xs text-muted-foreground">{item.subtitle}</span> : null}</span></label>) : <p className="py-8 text-center text-sm text-muted-foreground">No additional items available.</p>}</div><DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!selected.length} onClick={() => { run(onAdd, "Could not add selected items."); setOpen(false); }}>Add selected</Button></DialogFooter></DialogContent></Dialog>;
}
