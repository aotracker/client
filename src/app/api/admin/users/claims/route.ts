import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth/admin";
import {
  adminReassignCharacter,
  adminUnclaimCharacter,
} from "@/lib/db/user-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    userId?: string;
    action?: string;
    region?: string;
    albionId?: string;
    name?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userId || !body.region) {
    return NextResponse.json(
      { error: "userId and region are required" },
      { status: 400 }
    );
  }

  if (body.action === "unclaim") {
    const ok = await adminUnclaimCharacter(body.userId, body.region);
    if (!ok) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
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
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ ok: true, claim: result.claim });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
