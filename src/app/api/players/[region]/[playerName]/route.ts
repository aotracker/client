import { NextResponse } from "next/server";
import { getPlayerProfile } from "@/lib/db/queries";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";
import { resolvePlayerAlbionId } from "@/lib/entity-resolve";
import { playerPath } from "@/lib/seo";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ region: string; playerName: string }> }
) {
  const { region, playerName } = await params;

  if (!isRegionEnabled(region)) {
    return NextResponse.json({ error: "Region disabled" }, { status: 404 });
  }

  const albionRegion = region as AlbionRegion;

  try {
    const resolved = await resolvePlayerAlbionId(albionRegion, playerName);
    if (!resolved) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if ("pending" in resolved) {
      return NextResponse.json(
        {
          pending: true,
          entityName: resolved.entityName,
          entityType: resolved.entityType,
        },
        { status: 202 }
      );
    }
    if (resolved.redirectTo) {
      return NextResponse.redirect(
        new URL(
          resolved.redirectTo,
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
        ),
        301
      );
    }

    const albionId = resolved.albionId;
    if (!albionId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const profile = await getPlayerProfile(albionRegion, albionId);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...profile,
      canonicalPath: playerPath(albionRegion, profile.player.name),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch player" },
      { status: 500 }
    );
  }
}
