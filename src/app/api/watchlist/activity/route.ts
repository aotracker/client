import { NextResponse } from "next/server";
import { getWatchlistActivity } from "@/lib/db/queries";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      players?: { region: string; albionId: string }[];
      guilds?: { region: string; albionId: string }[];
    };

    const players = (body.players ?? []).filter(
      (p) => isRegionEnabled(p.region) && p.albionId
    ) as { region: AlbionRegion; albionId: string }[];

    const guilds = (body.guilds ?? []).filter(
      (g) => isRegionEnabled(g.region) && g.albionId
    ) as { region: AlbionRegion; albionId: string }[];

    const events = await getWatchlistActivity({ players, guilds }, 15);

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load watchlist",
      },
      { status: 500 }
    );
  }
}
