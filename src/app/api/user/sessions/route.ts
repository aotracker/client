import { NextResponse } from "next/server";
import { getSessionRowId } from "@/lib/auth";
import { requireUser, parseJsonBody, jsonError } from "@/lib/api-route";
import {
  listUserSessions,
  revokeOtherUserSessions,
  revokeUserSession,
} from "@/lib/db/user-data";

/** List active sessions for the signed-in user. Never includes session tokens. */
export async function GET() {
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const currentId = getSessionRowId(authz.session);
  const sessions = await listUserSessions(authz.userId, currentId);
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
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const currentId = getSessionRowId(authz.session);
  if (!currentId) {
    return jsonError("No session", 400);
  }

  const parsed = await parseJsonBody<{ id?: unknown; others?: unknown }>(
    request
  );
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  if (body.others === true) {
    const revoked = await revokeOtherUserSessions(authz.userId, currentId);
    return NextResponse.json({ ok: true, revoked });
  }

  if (typeof body.id !== "string" || body.id.trim().length === 0) {
    return jsonError("id is required", 400);
  }

  const result = await revokeUserSession(
    authz.userId,
    body.id.trim(),
    currentId
  );
  if (result === "current") {
    return jsonError("Cannot revoke the current session", 400);
  }
  if (result === "missing") {
    return jsonError("Session not found", 404);
  }
  return NextResponse.json({ ok: true });
}
