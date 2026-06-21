import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      messageId: string;
      feedback: "up" | "down";
      content?: string;
    };

    if (!body.messageId || !body.feedback) {
      return NextResponse.json(
        { error: "messageId and feedback are required" },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
