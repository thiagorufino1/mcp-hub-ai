import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Admin Dashboard — MCP Hub" };

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [mcpCount, skillCount, llmCount, groupCount, userCount] = await Promise.all([
    prisma.mcpServer.count(),
    prisma.skill.count(),
    prisma.llmConfig.count(),
    prisma.entraGroup.count(),
    prisma.user.count(),
  ]);

  const stats = [
    { label: "MCP Servers", value: mcpCount, href: "/admin/mcp" },
    { label: "Skills", value: skillCount, href: "/admin/skills" },
    { label: "LLM Configs", value: llmCount, href: "/admin/llm" },
    { label: "Groups", value: groupCount, href: "/admin/groups" },
    { label: "Users", value: userCount, href: null },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
