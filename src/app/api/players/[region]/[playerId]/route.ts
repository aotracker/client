import { NextResponse } from "next/server";
import { getPlayerProfile } from "@/lib/db/queries";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ region: string; playerId: string }> }
) {
  const { region, playerId } = await params;

  if (!isRegionEnabled(region)) {
    return NextResponse.json({ error: "Region disabled" }, { status: 404 });
  }

  try {
    const profile = await getPlayerProfile(region as AlbionRegion, playerId);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch player" },
      { status: 500 }
    );
  }
}
