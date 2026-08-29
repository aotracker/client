import { inArray } from "drizzle-orm";
import type { AlbionRegion } from "@/lib/albion/types";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { HEALTH_CACHE_REVALIDATE_SECONDS, cachedQuery } from "@/lib/cache";
import { db, schema } from "@/lib/db";

export async function getApiSyncState() {
  if (ENABLED_REGIONS.length === 0) return [];
  return db.query.apiSyncState.findMany({
    where: inArray(schema.apiSyncState.region, ENABLED_REGIONS),
  });
}

export interface RegionEntityCounts {
  region: AlbionRegion;
  players: number;
  guilds: number;
  kills: number;
  battles: number;
}

async function loadRegionEntityCounts(): Promise<RegionEntityCounts[]> {
  if (ENABLED_REGIONS.length === 0) return [];

  const rows = await db
    .select({
      region: schema.apiSyncState.region,
      players: schema.apiSyncState.playerCount,
      guilds: schema.apiSyncState.guildCount,
      kills: schema.apiSyncState.killCount,
      battles: schema.apiSyncState.battleCount,
    })
    .from(schema.apiSyncState)
    .where(inArray(schema.apiSyncState.region, ENABLED_REGIONS));

  const byRegion = new Map(rows.map((row) => [row.region, row]));

  return ENABLED_REGIONS.map((region) => {
    const row = byRegion.get(region);
    return {
      region,
      players: row?.players ?? 0,
      guilds: row?.guilds ?? 0,
      kills: row?.kills ?? 0,
      battles: row?.battles ?? 0,
    };
  });
}

const cachedRegionEntityCounts = cachedQuery(
  async (_regionsKey: string) => loadRegionEntityCounts(),
  ["region-entity-counts"],
  HEALTH_CACHE_REVALIDATE_SECONDS,
  ["health"]
);

export async function getRegionEntityCounts(): Promise<RegionEntityCounts[]> {
  return cachedRegionEntityCounts(ENABLED_REGIONS.join(","));
}

export { getGlobalSyncStatus, getLatestKillAtByRegion } from "@/lib/health/sync-status";
