import { count, desc, gte, isNotNull } from "drizzle-orm";
import type { AlbionRegion } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";

/** Sitemap helpers — lean selects only. */

export interface SitemapEntityRow {
  albionId: string;
  name: string;
  region: AlbionRegion;
  updatedAt: Date | null;
}

export interface SitemapNumericEntityRow {
  entityId: number;
  region: AlbionRegion;
  updatedAt: Date | null;
}

const SITEMAP_KILL_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

export async function countSitemapPlayers(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(schema.players)
    .where(isNotNull(schema.players.lastSyncedAt));
  return row?.value ?? 0;
}

export async function countSitemapGuilds(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(schema.guilds)
    .where(isNotNull(schema.guilds.lastSyncedAt));
  return row?.value ?? 0;
}

export async function countSitemapAlliances(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(schema.alliances)
    .where(isNotNull(schema.alliances.lastSyncedAt));
  return row?.value ?? 0;
}

export async function countSitemapKills(): Promise<number> {
  const cutoff = new Date(Date.now() - SITEMAP_KILL_LOOKBACK_MS);
  const [row] = await db
    .select({ value: count() })
    .from(schema.killEvents)
    .where(gte(schema.killEvents.occurredAt, cutoff));
  return row?.value ?? 0;
}

export async function countSitemapBattles(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(schema.battles);
  return row?.value ?? 0;
}

export async function listSitemapPlayers(
  offset: number,
  limit: number
): Promise<SitemapEntityRow[]> {
  return db
    .select({
      albionId: schema.players.albionId,
      name: schema.players.name,
      region: schema.players.region,
      updatedAt: schema.players.updatedAt,
    })
    .from(schema.players)
    .where(isNotNull(schema.players.lastSyncedAt))
    .orderBy(desc(schema.players.killFame), desc(schema.players.updatedAt))
    .offset(offset)
    .limit(limit);
}

export async function listSitemapGuilds(
  offset: number,
  limit: number
): Promise<SitemapEntityRow[]> {
  return db
    .select({
      albionId: schema.guilds.albionId,
      name: schema.guilds.name,
      region: schema.guilds.region,
      updatedAt: schema.guilds.updatedAt,
    })
    .from(schema.guilds)
    .where(isNotNull(schema.guilds.lastSyncedAt))
    .orderBy(desc(schema.guilds.killFame), desc(schema.guilds.updatedAt))
    .offset(offset)
    .limit(limit);
}

export async function listSitemapAlliances(
  offset: number,
  limit: number
): Promise<SitemapEntityRow[]> {
  return db
    .select({
      albionId: schema.alliances.albionId,
      name: schema.alliances.name,
      region: schema.alliances.region,
      updatedAt: schema.alliances.updatedAt,
    })
    .from(schema.alliances)
    .where(isNotNull(schema.alliances.lastSyncedAt))
    .orderBy(desc(schema.alliances.updatedAt))
    .offset(offset)
    .limit(limit);
}

export async function listSitemapKills(
  offset: number,
  limit: number
): Promise<SitemapNumericEntityRow[]> {
  const cutoff = new Date(Date.now() - SITEMAP_KILL_LOOKBACK_MS);
  const rows = await db
    .select({
      entityId: schema.killEvents.eventId,
      region: schema.killEvents.region,
      updatedAt: schema.killEvents.occurredAt,
    })
    .from(schema.killEvents)
    .where(gte(schema.killEvents.occurredAt, cutoff))
    .orderBy(desc(schema.killEvents.totalVictimKillFame), desc(schema.killEvents.occurredAt))
    .offset(offset)
    .limit(limit);
  return rows;
}

export async function listSitemapBattles(
  offset: number,
  limit: number
): Promise<SitemapNumericEntityRow[]> {
  const rows = await db
    .select({
      entityId: schema.battles.albionBattleId,
      region: schema.battles.region,
      updatedAt: schema.battles.lastSyncedAt,
    })
    .from(schema.battles)
    .orderBy(desc(schema.battles.totalFame), desc(schema.battles.startTime))
    .offset(offset)
    .limit(limit);
  return rows;
}
