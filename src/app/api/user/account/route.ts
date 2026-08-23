import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  clearUserSyncedPrefs,
  deleteUserAccount,
} from "@/lib/db/user-data";

/** Clear synced prefs or fully delete the signed-in account. */
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const wipeAccount = url.searchParams.get("account") === "1";

  if (wipeAccount) {
    await deleteUserAccount(session.user.id);
    return NextResponse.json({ ok: true, deleted: "account" });
  }

  await clearUserSyncedPrefs(session.user.id);
  return NextResponse.json({ ok: true, deleted: "prefs" });
}
