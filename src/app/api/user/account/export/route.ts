import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserAccountExport } from "@/lib/db/user-data";

/** JSON export of synced prefs and linked provider ids (no tokens, no email). */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getUserAccountExport(session.user.id);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="aotracker-account.json"',
      "Cache-Control": "no-store",
    },
  });
}
