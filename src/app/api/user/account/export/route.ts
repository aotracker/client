import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-route";
import { getUserAccountExport } from "@/lib/db/user-data";

/** JSON export of synced prefs and linked provider ids (no tokens, no email). */
export async function GET() {
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const payload = await getUserAccountExport(authz.userId);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="aotracker-account.json"',
      "Cache-Control": "no-store",
    },
  });
}
