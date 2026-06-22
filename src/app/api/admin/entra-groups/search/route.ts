import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { searchEntraGroups } from "@/lib/entra-graph";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  try {
    const groups = await searchEntraGroups(q);
    return NextResponse.json({ groups });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to search Entra groups.",
      },
      { status: 500 },
    );
  }
}
