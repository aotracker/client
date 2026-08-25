import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
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
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claims = await listClaimedCharacters(session.user.id);
  return NextResponse.json({ claims });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = `claim:${session.user.id}`;
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

  let body: { region?: string; albionId?: string; name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await claimCharacter(session.user.id, body.region ?? "", {
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
  return NextResponse.json({ claim: result.claim });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    return NextResponse.json({ error: "invalid_region" }, { status: 400 });
  }

  const ok = await unclaimCharacter(session.user.id, region);
  if (!ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
