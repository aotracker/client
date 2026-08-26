import { NextResponse } from "next/server";
import { getWatchlistActivity } from "@/lib/db/queries";
import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";
import { parseJuicyFlag } from "@/lib/kills-feed-params";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      players?: { region: string; albionId: string }[];
      guilds?: { region: string; albionId: string }[];
      alliances?: { region: string; albionId: string }[];
      juicy?: string | boolean;
    };

    const players = (body.players ?? []).filter(
      (p) => isRegionEnabled(p.region) && p.albionId
    ) as { region: AlbionRegion; albionId: string }[];

    const guilds = (body.guilds ?? []).filter(
      (g) => isRegionEnabled(g.region) && g.albionId
    ) as { region: AlbionRegion; albionId: string }[];

    const alliances = (body.alliances ?? []).filter(
      (a) => isRegionEnabled(a.region) && a.albionId
    ) as { region: AlbionRegion; albionId: string }[];

    const events = await getWatchlistActivity(
      { players, guilds, alliances },
      15,
      { juicy: parseJuicyFlag(body.juicy) }
    );

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
