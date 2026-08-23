import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth/admin";
import { listUsersForAdmin, setUserAdmin } from "@/lib/db/user-data";

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const users = await listUsersForAdmin({ q });
  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const access = await verifyAdminRequest(request);
  if (!access.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { userId?: string; isAdmin?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userId || typeof body.isAdmin !== "boolean") {
    return NextResponse.json(
      { error: "userId and isAdmin are required" },
      { status: 400 }
    );
  }

  if (
    access.via === "session" &&
    access.userId === body.userId &&
    body.isAdmin === false
  ) {
    return NextResponse.json(
      { error: "You cannot demote yourself" },
      { status: 400 }
    );
  }

  const ok = await setUserAdmin(body.userId, body.isAdmin);
  if (!ok) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    userId: body.userId,
    isAdmin: body.isAdmin,
  });
}
