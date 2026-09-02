import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import type { KillCardEvent } from "@/lib/albion/player-history";
import { getWatchlistActivity } from "@/lib/db/queries";
import { listLiveGuildKeys, listLivePlayers } from "@/lib/db/queries/media";
import { getUserWatchlist } from "@/lib/db/user-data";
import type { WatchlistEntry } from "@/lib/watchlist";

export type WatchlistPageSeed = {
  entries: WatchlistEntry[];
  activity: KillCardEvent[];
  liveIds: string[];
  liveGuildIds: string[];
};

export async function getWatchlistPageSeed(
  userId: string,
  juicy: boolean
): Promise<WatchlistPageSeed> {
  const entries = await getUserWatchlist(userId);
  const players = entries
    .filter((e) => e.type === "player" && isRegionEnabled(e.region))
    .map((e) => ({ region: e.region as AlbionRegion, albionId: e.albionId }));
  const guilds = entries
    .filter((e) => e.type === "guild" && isRegionEnabled(e.region))
    .map((e) => ({ region: e.region as AlbionRegion, albionId: e.albionId }));
  const alliances = entries
    .filter((e) => e.type === "alliance" && isRegionEnabled(e.region))
    .map((e) => ({ region: e.region as AlbionRegion, albionId: e.albionId }));

  if (players.length === 0 && guilds.length === 0 && alliances.length === 0) {
    return { entries, activity: [], liveIds: [], liveGuildIds: [] };
  }

  const wantedPlayers = new Set(
    players.map((row) => `${row.region}:${row.albionId}`)
  );

  const [activity, live, liveGuilds] = await Promise.all([
    getWatchlistActivity({ players, guilds, alliances }, 15, { juicy }),
    wantedPlayers.size > 0
      ? listLivePlayers({ region: "all", limit: 100 })
      : Promise.resolve([]),
    listLiveGuildKeys(guilds),
  ]);

  return {
    entries,
    activity,
    liveIds: live
      .filter((row) =>
        wantedPlayers.has(`${row.region}:${row.playerAlbionId}`)
      )
      .map((row) => `${row.region}:${row.playerAlbionId}`),
    liveGuildIds: liveGuilds.map(
      (row) => `${row.region}:${row.albionId}`
    ),
  };
}
