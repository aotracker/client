import { count, desc, gte, isNotNull, max, sql } from "drizzle-orm";
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

export const SITEMAP_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

function lookbackCutoff(): Date {
  return new Date(Date.now() - SITEMAP_LOOKBACK_MS);
}

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
  const [row] = await db
    .select({ value: count() })
    .from(schema.killEvents)
    .where(gte(schema.killEvents.occurredAt, lookbackCutoff()));
  return row?.value ?? 0;
}

export async function countSitemapBattles(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(schema.battles)
    .where(gte(schema.battles.startTime, lookbackCutoff()));
  return row?.value ?? 0;
}

export async function maxSitemapPlayersUpdatedAt(): Promise<Date | null> {
  const [row] = await db
    .select({ value: max(schema.players.updatedAt) })
    .from(schema.players)
    .where(isNotNull(schema.players.lastSyncedAt));
  return row?.value ?? null;
}

export async function maxSitemapGuildsUpdatedAt(): Promise<Date | null> {
  const [row] = await db
    .select({ value: max(schema.guilds.updatedAt) })
    .from(schema.guilds)
    .where(isNotNull(schema.guilds.lastSyncedAt));
  return row?.value ?? null;
}

export async function maxSitemapAlliancesUpdatedAt(): Promise<Date | null> {
  const [row] = await db
    .select({ value: max(schema.alliances.updatedAt) })
    .from(schema.alliances)
    .where(isNotNull(schema.alliances.lastSyncedAt));
  return row?.value ?? null;
}

export async function maxSitemapKillsUpdatedAt(): Promise<Date | null> {
  const [row] = await db
    .select({ value: max(schema.killEvents.occurredAt) })
    .from(schema.killEvents)
    .where(gte(schema.killEvents.occurredAt, lookbackCutoff()));
  return row?.value ?? null;
}

export async function maxSitemapBattlesUpdatedAt(): Promise<Date | null> {
  const [row] = await db
    .select({
      value: max(
        sql<Date | string>`COALESCE(${schema.battles.lastSyncedAt}, ${schema.battles.startTime})`
      ),
    })
    .from(schema.battles)
    .where(gte(schema.battles.startTime, lookbackCutoff()));
  const value = row?.value;
  if (value == null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
  return db
    .select({
      entityId: schema.killEvents.eventId,
      region: schema.killEvents.region,
      updatedAt: schema.killEvents.occurredAt,
    })
    .from(schema.killEvents)
    .where(gte(schema.killEvents.occurredAt, lookbackCutoff()))
    .orderBy(desc(schema.killEvents.totalVictimKillFame), desc(schema.killEvents.occurredAt))
    .offset(offset)
    .limit(limit);
}

export async function listSitemapBattles(
  offset: number,
  limit: number
): Promise<SitemapNumericEntityRow[]> {
  return db
    .select({
      entityId: schema.battles.albionBattleId,
      region: schema.battles.region,
      updatedAt: sql<Date | null>`COALESCE(${schema.battles.lastSyncedAt}, ${schema.battles.startTime})`,
    })
    .from(schema.battles)
    .where(gte(schema.battles.startTime, lookbackCutoff()))
    .orderBy(desc(schema.battles.totalFame), desc(schema.battles.startTime))
    .offset(offset)
    .limit(limit);
}
