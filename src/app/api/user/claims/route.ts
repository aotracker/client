import { NextResponse } from "next/server";
import { requireUser, parseJsonBody, jsonError } from "@/lib/api-route";
import { isRegionEnabled } from "@/lib/albion/types";
import {
  claimCharacter,
  listClaimedCharacters,
  unclaimCharacter,
} from "@/lib/db/user-data";
import { consumeRateLimit, rateLimitRetryAfterSec } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const CLAIM_LIMIT = 8;
const CLAIM_WINDOW_MS = 10 * 60 * 1000;

export async function GET() {
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const claims = await listClaimedCharacters(authz.userId);
  return NextResponse.json({ claims });
}

export async function PUT(request: Request) {
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const key = `claim:${authz.userId}`;
  if (!consumeRateLimit(key, CLAIM_LIMIT, CLAIM_WINDOW_MS)) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitRetryAfterSec(key, CLAIM_WINDOW_MS)),
        },
      }
    );
  }

  const parsed = await parseJsonBody<{
    region?: string;
    albionId?: string;
    name?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;

  const result = await claimCharacter(authz.userId, parsed.body.region ?? "", {
    albionId: parsed.body.albionId,
    name: parsed.body.name,
  });
  if (!result.ok) {
    const status =
      result.error === "invalid_region" || result.error === "not_found"
        ? 400
        : 409;
    return jsonError(result.error, status);
  }
  return NextResponse.json({ claim: result.claim });
}

export async function DELETE(request: Request) {
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const url = new URL(request.url);
  let region = url.searchParams.get("region") ?? "";
  if (!region) {
    try {
      const body = (await request.json()) as { region?: string };
      region = body.region ?? "";
    } catch {
      region = "";
    }
  }
  if (!isRegionEnabled(region)) {
    return jsonError("invalid_region", 400);
  }

  const ok = await unclaimCharacter(authz.userId, region);
  if (!ok) {
    return jsonError("not_found", 404);
  }
  return NextResponse.json({ ok: true });
}
