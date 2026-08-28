import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-route";
import {
  clearUserSyncedPrefs,
  deleteUserAccount,
} from "@/lib/db/user-data";

/** Clear synced prefs or fully delete the signed-in account. */
export async function DELETE(request: Request) {
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const url = new URL(request.url);
  const wipeAccount = url.searchParams.get("account") === "1";

  if (wipeAccount) {
    await deleteUserAccount(authz.userId);
    return NextResponse.json({ ok: true, deleted: "account" });
  }

  await clearUserSyncedPrefs(authz.userId);
  return NextResponse.json({ ok: true, deleted: "prefs" });
}
