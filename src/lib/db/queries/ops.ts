import { count, inArray } from "drizzle-orm";
import type { AlbionRegion } from "@/lib/albion/types";
import { ENABLED_REGIONS } from "@/lib/albion/types";
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

export async function getRegionEntityCounts(): Promise<RegionEntityCounts[]> {
  if (ENABLED_REGIONS.length === 0) return [];

  const [playerRows, guildRows, killRows, battleRows] = await Promise.all([
    db
      .select({
        region: schema.players.region,
        count: count(),
      })
      .from(schema.players)
      .where(inArray(schema.players.region, ENABLED_REGIONS))
      .groupBy(schema.players.region),
    db
      .select({
        region: schema.guilds.region,
        count: count(),
      })
      .from(schema.guilds)
      .where(inArray(schema.guilds.region, ENABLED_REGIONS))
      .groupBy(schema.guilds.region),
    db
      .select({
        region: schema.killEvents.region,
        count: count(),
      })
      .from(schema.killEvents)
      .where(inArray(schema.killEvents.region, ENABLED_REGIONS))
      .groupBy(schema.killEvents.region),
    db
      .select({
        region: schema.battles.region,
        count: count(),
      })
      .from(schema.battles)
      .where(inArray(schema.battles.region, ENABLED_REGIONS))
      .groupBy(schema.battles.region),
  ]);

  const playersByRegion = new Map(
    playerRows.map((row) => [row.region, row.count])
  );
  const guildsByRegion = new Map(guildRows.map((row) => [row.region, row.count]));
  const killsByRegion = new Map(killRows.map((row) => [row.region, row.count]));
  const battlesByRegion = new Map(
    battleRows.map((row) => [row.region, row.count])
  );

  return ENABLED_REGIONS.map((region) => ({
    region,
    players: playersByRegion.get(region) ?? 0,
    guilds: guildsByRegion.get(region) ?? 0,
    kills: killsByRegion.get(region) ?? 0,
    battles: battlesByRegion.get(region) ?? 0,
  }));
}

export { getGlobalSyncStatus, getLatestKillAtByRegion } from "@/lib/health/sync-status";
