import { NextResponse } from "next/server";

/** Human ops cookie login removed — use Discord sign-in at /admin. */
export async function GET() {
  return NextResponse.json(
    {
      error: "Gone",
      message:
        "Ops cookie login was removed. Sign in with Discord at /admin. Machine callers use Authorization: Bearer CRON_SECRET.",
    },
    { status: 410 }
  );
}
