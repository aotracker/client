import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth/admin";
import { getDiscordBotStatus } from "@/lib/ops/discord-bot-status";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getDiscordBotStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Discord status unavailable",
      },
      { status: 500 }
    );
  }
}
