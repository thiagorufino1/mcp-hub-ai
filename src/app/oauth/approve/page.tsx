import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { approveOAuth, denyOAuth } from "./actions";

export default async function ApprovePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const params = await searchParams;
  const hubState = params.hub_state ?? "";
  const clientName = params.client_name ?? "Unknown Client";
  const scope = params.scope ?? "";
  const originalState = params.original_state ?? "";
  const codeChallenge = params.code_challenge ?? "";

  const scopeLabels: Record<string, string> = {
    "mcp:proxy": "Access all MCP tools available to you",
  };

  const scopeParts = scope.split(" ").filter(Boolean);
  const scopeDescriptions = scopeParts.map((s) => {
    if (scopeLabels[s]) return scopeLabels[s];
    if (s.startsWith("mcp:namespace:")) return `Access namespace: ${s.split(":")[2]}`;
    return s;
  });

  return (
    <main style={{ maxWidth: 480, margin: "80px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Authorization Request</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        <strong>{clientName}</strong> is requesting access to your MCP Hub account.
      </p>

      <section style={{ background: "#f5f5f5", borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Permissions requested</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {scopeDescriptions.map((desc) => (
            <li key={desc} style={{ fontSize: 14, marginBottom: 4 }}>{desc}</li>
          ))}
        </ul>
      </section>

      <p style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>
        Signed in as <strong>{session.user.email}</strong>
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <form action={approveOAuth}>
          <input type="hidden" name="hub_state" value={hubState} />
          <input type="hidden" name="code_challenge" value={codeChallenge} />
          <input type="hidden" name="original_state" value={originalState} />
          <button
            type="submit"
            style={{
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px 24px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Approve
          </button>
        </form>

        <form action={denyOAuth}>
          <input type="hidden" name="hub_state" value={hubState} />
          <input type="hidden" name="original_state" value={originalState} />
          <button
            type="submit"
            style={{
              background: "transparent",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: "10px 24px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Deny
          </button>
        </form>
      </div>
    </main>
  );
}
