"use client";

import { useState } from "react";

import {
  deleteNamespace,
  deleteWorkspace,
  type NamespaceRow,
  type WorkspaceRow,
} from "./actions";
import { NamespaceForm } from "@/components/admin/namespace-form";
import { WorkspaceForm } from "@/components/admin/workspace-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Option = { id: string; displayName: string };
type SkillOption = { id: string; name: string };
type LlmOption = { id: string; displayName: string; allowedModels: string[] };
type ToolOption = {
  id: string;
  name: string;
  displayName: string | null;
  description: string | null;
  serverName: string;
};

export function WorkspacesAdminClient({
  groups,
  llms,
  namespaces,
  registryTools,
  skills,
  users,
  workspaces,
}: {
  groups: Option[];
  llms: LlmOption[];
  namespaces: NamespaceRow[];
  registryTools: ToolOption[];
  skills: SkillOption[];
  users: Array<{ id: string; name: string | null; email: string | null }>;
  workspaces: WorkspaceRow[];
}) {
  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceRow | null | undefined>();
  const [namespaceForm, setNamespaceForm] = useState<NamespaceRow | null | undefined>();

  return (
    <div className="portal-page">
      <div className="portal-page-heading">
        <h1 className="text-2xl font-bold">Workspaces & Namespaces</h1>
        <p className="text-sm text-muted-foreground">
          Compose governed agents for chat and publish curated MCP endpoints.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Workspaces / Agents</h2>
            <p className="text-sm text-muted-foreground">
              Model, prompt, skills, namespace and audience.
            </p>
          </div>
          <Button onClick={() => setWorkspaceForm(null)}>Add workspace</Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {workspaces.map((workspace) => (
            <Card key={workspace.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{workspace.name}</CardTitle>
                    <CardDescription>/{workspace.slug}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    {workspace.isDefault ? <Badge>default</Badge> : null}
                    <Badge variant={workspace.enabled ? "outline" : "secondary"}>
                      {workspace.enabled ? "enabled" : "disabled"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {workspace.description || "No description."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {workspace.skills.length} skills · max {workspace.maxSteps} steps
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setWorkspaceForm(workspace)}>
                    Edit
                  </Button>
                  <form action={async () => deleteWorkspace(workspace.id)}>
                    <Button variant="ghost" size="sm" type="submit">Delete</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
          {workspaces.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No workspaces</CardTitle>
                <CardDescription>Create the first governed agent.</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">MCP Namespaces</h2>
            <p className="text-sm text-muted-foreground">
              Curated tool catalogs exposed through one Streamable HTTP endpoint.
            </p>
          </div>
          <Button onClick={() => setNamespaceForm(null)}>Add namespace</Button>
        </div>
        <div className="portal-table-shell">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Namespace</th>
                <th className="px-4 py-3 text-left">Tools</th>
                <th className="px-4 py-3 text-left">Endpoint</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {namespaces.map((namespace) => (
                <tr key={namespace.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{namespace.name}</p>
                    <div className="mt-1 flex gap-1">
                      <Badge variant={namespace.published ? "default" : "secondary"}>
                        {namespace.published ? "published" : "private"}
                      </Badge>
                      {!namespace.enabled ? <Badge variant="secondary">disabled</Badge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{namespace.tools.length}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    /api/mcp/namespaces/{namespace.slug}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setNamespaceForm(namespace)}>
                        Edit
                      </Button>
                      <form action={async () => deleteNamespace(namespace.id)}>
                        <Button variant="ghost" size="sm" type="submit">Delete</Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {namespaces.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No namespaces configured.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <WorkspaceForm
        open={workspaceForm !== undefined}
        workspace={workspaceForm ?? undefined}
        groups={groups}
        llms={llms}
        namespaces={namespaces.map(({ id, name }) => ({ id, name }))}
        skills={skills}
        users={users}
        onClose={() => setWorkspaceForm(undefined)}
      />
      <NamespaceForm
        open={namespaceForm !== undefined}
        namespace={namespaceForm ?? undefined}
        groups={groups}
        registryTools={registryTools}
        users={users}
        onClose={() => setNamespaceForm(undefined)}
      />
    </div>
  );
}
