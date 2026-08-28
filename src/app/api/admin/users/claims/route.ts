import { NextResponse } from "next/server";
import { jsonError, parseJsonBody } from "@/lib/api-route";
import { verifyAdminRequest } from "@/lib/auth/admin";
import {
  adminReassignCharacter,
  adminUnclaimCharacter,
} from "@/lib/db/user-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = await parseJsonBody<{
    userId?: string;
    action?: string;
    region?: string;
    albionId?: string;
    name?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  if (!body.userId || !body.region) {
    return jsonError("userId and region are required", 400);
  }

  if (body.action === "unclaim") {
    const ok = await adminUnclaimCharacter(body.userId, body.region);
    if (!ok) {
      return jsonError("not_found", 404);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reassign") {
    const result = await adminReassignCharacter(body.userId, body.region, {
      albionId: body.albionId,
      name: body.name,
    });
    if (!result.ok) {
      const status =
        result.error === "invalid_region" || result.error === "not_found"
          ? 400
          : 409;
      return jsonError(result.error, status);
    }
    return NextResponse.json({ ok: true, claim: result.claim });
  }

  return jsonError("Unknown action", 400);
}
