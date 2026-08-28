import { NextResponse } from "next/server";
import { jsonError, parseJsonBody } from "@/lib/api-route";
import { verifyAdminRequest } from "@/lib/auth/admin";
import { listUsersForAdmin, setUserAdmin } from "@/lib/db/user-data";

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return jsonError("Unauthorized", 401);
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const users = await listUsersForAdmin({ q });
  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const access = await verifyAdminRequest(request);
  if (!access.ok) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = await parseJsonBody<{ userId?: string; isAdmin?: boolean }>(
    request
  );
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  if (!body.userId || typeof body.isAdmin !== "boolean") {
    return jsonError("userId and isAdmin are required", 400);
  }

  if (
    access.via === "session" &&
    access.userId === body.userId &&
    body.isAdmin === false
  ) {
    return jsonError("You cannot demote yourself", 400);
  }

  const ok = await setUserAdmin(body.userId, body.isAdmin);
  if (!ok) {
    return jsonError("User not found", 404);
  }

  return NextResponse.json({
    ok: true,
    userId: body.userId,
    isAdmin: body.isAdmin,
  });
}
