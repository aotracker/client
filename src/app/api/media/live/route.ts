import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api-route";
import { listLiveGuildKeys, listLivePlayers } from "@/lib/db/queries/media";
import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await parseJsonBody<{
    players?: Array<{ region: string; albionId: string }>;
    guilds?: Array<{ region: string; albionId: string }>;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const wantedPlayers = new Set(
    (parsed.body.players ?? [])
      .filter(
        (row) =>
          row.albionId &&
          row.region &&
          isRegionEnabled(row.region)
      )
      .map((row) => `${row.region}:${row.albionId}`)
  );
  const wantedGuilds = (parsed.body.guilds ?? []).filter(
    (row) =>
      row.albionId && row.region && isRegionEnabled(row.region)
  ) as Array<{ region: AlbionRegion; albionId: string }>;

  if (wantedPlayers.size === 0 && wantedGuilds.length === 0) {
    return NextResponse.json({ live: [], liveGuilds: [] });
  }

  const [live, liveGuilds] = await Promise.all([
    wantedPlayers.size > 0
      ? listLivePlayers({ region: "all", limit: 100 })
      : Promise.resolve([]),
    listLiveGuildKeys(wantedGuilds),
  ]);
  return NextResponse.json({
    live: live
      .filter((row) => wantedPlayers.has(`${row.region}:${row.playerAlbionId}`))
      .map((row) => ({
        region: row.region as AlbionRegion,
        albionId: row.playerAlbionId,
      })),
    liveGuilds,
  });
}
