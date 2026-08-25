import { NextResponse } from "next/server";
import { getSession, getSessionRowId } from "@/lib/auth";
import {
  listUserSessions,
  revokeOtherUserSessions,
  revokeUserSession,
} from "@/lib/db/user-data";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** List active sessions for the signed-in user. Never includes session tokens. */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return unauthorized();

  const currentId = getSessionRowId(session);
  const sessions = await listUserSessions(session.user.id, currentId);
  return NextResponse.json({
    sessions: sessions.map((row) => ({
      id: row.id,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      current: row.current,
    })),
  });
}

/** Revoke one other session (`id`) or every session except the current one. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) return unauthorized();

  const currentId = getSessionRowId(session);
  if (!currentId) {
    return NextResponse.json({ error: "No session" }, { status: 400 });
  }

  let body: { id?: unknown; others?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.others === true) {
    const revoked = await revokeOtherUserSessions(session.user.id, currentId);
    return NextResponse.json({ ok: true, revoked });
  }

  if (typeof body.id !== "string" || body.id.trim().length === 0) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const result = await revokeUserSession(
    session.user.id,
    body.id.trim(),
    currentId
  );
  if (result === "current") {
    return NextResponse.json(
      { error: "Cannot revoke the current session" },
      { status: 400 }
    );
  }
  if (result === "missing") {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
