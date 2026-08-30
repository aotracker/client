import { NextResponse } from "next/server";
import { jsonError, parseJsonBody } from "@/lib/api-route";
import { verifyAdminRequest } from "@/lib/auth/admin";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";
import { isMediaPlatform } from "@/lib/media/urls";
import {
  attachGuildMediaPin,
  attachPlayerMedia,
  listGuildMediaPins,
  listPlayerMediaLinks,
  unlinkGuildMediaPin,
  unlinkPlayerMedia,
} from "@/lib/db/queries/media";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request)).ok) {
    return jsonError("Unauthorized", 401);
  }
  const [players, guilds] = await Promise.all([
    listPlayerMediaLinks(),
    listGuildMediaPins(),
  ]);
  return NextResponse.json({ players, guilds });
}

export async function POST(request: Request) {
  const access = await verifyAdminRequest(request);
  if (!access.ok) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = await parseJsonBody<{
    action?: string;
    target?: string;
    id?: string;
    region?: string;
    albionId?: string;
    platform?: string;
    channelId?: string;
    login?: string;
    displayName?: string;
    avatarUrl?: string | null;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const createdByUserId =
    access.via === "session" ? (access.userId ?? null) : null;

  if (body.action === "unlink") {
    if (!body.id || !body.target) {
      return jsonError("id and target are required", 400);
    }
    const ok =
      body.target === "guild"
        ? await unlinkGuildMediaPin(body.id)
        : await unlinkPlayerMedia(body.id);
    if (!ok) return jsonError("not_found", 404);
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "attach") {
    return jsonError("Unknown action", 400);
  }

  if (
    !body.region ||
    !isRegionEnabled(body.region) ||
    !body.albionId ||
    !body.platform ||
    !isMediaPlatform(body.platform) ||
    !body.channelId ||
    !body.login ||
    !body.displayName
  ) {
    return jsonError("region, albionId, platform, and channel fields are required", 400);
  }

  const channel = {
    platform: body.platform,
    channelId: body.channelId,
    login: body.login,
    displayName: body.displayName,
    avatarUrl: body.avatarUrl ?? null,
  };
  const region = body.region as AlbionRegion;

  try {
    if (body.target === "guild") {
      const pin = await attachGuildMediaPin({
        region,
        guildAlbionId: body.albionId,
        createdByUserId,
        channel,
      });
      return NextResponse.json({ ok: true, pin });
    }
    const link = await attachPlayerMedia({
      region,
      playerAlbionId: body.albionId,
      createdByUserId,
      channel,
    });
    return NextResponse.json({ ok: true, link });
  } catch (err) {
    const message = err instanceof Error ? err.message : "attach_failed";
    const status =
      message === "player_not_found" || message === "guild_not_found"
        ? 404
        : 400;
    return jsonError(message, status);
  }
}
