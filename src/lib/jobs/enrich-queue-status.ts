import { and, eq, inArray } from "drizzle-orm";
import type { AlbionRegion } from "@/lib/albion/types";
import { db, schema } from "@/lib/db";
import type { QueueJobSummary, QueueStatusSnapshot } from "./types";

function asString(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function entityKey(region: string, albionId: string): string {
  return `${region}:${albionId}`;
}

async function loadPlayerNames(
  byRegion: Map<string, Set<string>>
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  await Promise.all(
    Array.from(byRegion.entries()).map(async ([region, ids]) => {
      if (ids.size === 0) return;
      const rows = await db.query.players.findMany({
        where: and(
          eq(schema.players.region, region as AlbionRegion),
          inArray(schema.players.albionId, [...ids])
        ),
        columns: { albionId: true, name: true },
      });
      for (const row of rows) {
        if (row.name) names.set(entityKey(region, row.albionId), row.name);
      }
    })
  );
  return names;
}

async function loadGuildNames(
  byRegion: Map<string, Set<string>>
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  await Promise.all(
    Array.from(byRegion.entries()).map(async ([region, ids]) => {
      if (ids.size === 0) return;
      const rows = await db.query.guilds.findMany({
        where: and(
          eq(schema.guilds.region, region as AlbionRegion),
          inArray(schema.guilds.albionId, [...ids])
        ),
        columns: { albionId: true, name: true },
      });
      for (const row of rows) {
        if (row.name) names.set(entityKey(region, row.albionId), row.name);
      }
    })
  );
  return names;
}

function enrichJobData(
  job: QueueJobSummary,
  playerNames: Map<string, string>,
  guildNames: Map<string, string>
): QueueJobSummary {
  const region = asString(job.data.region);
  if (!region) return job;

  const playerAlbionId =
    asString(job.data.albionId) ?? asString(job.data.playerId);
  const guildAlbionId = asString(job.data.guildId);

  const data = { ...job.data };
  if (playerAlbionId) {
    const playerName = playerNames.get(entityKey(region, playerAlbionId));
    if (playerName) data.playerName = playerName;
  }
  if (guildAlbionId) {
    const guildName = guildNames.get(entityKey(region, guildAlbionId));
    if (guildName) data.guildName = guildName;
  }

  if (data.playerName === job.data.playerName && data.guildName === job.data.guildName) {
    return job;
  }
  return { ...job, data };
}

export async function enrichQueueStatusWithEntityNames(
  snapshot: QueueStatusSnapshot | null
): Promise<QueueStatusSnapshot | null> {
  if (!snapshot || snapshot.jobs.length === 0) return snapshot;

  const playersByRegion = new Map<string, Set<string>>();
  const guildsByRegion = new Map<string, Set<string>>();

  for (const job of snapshot.jobs) {
    const region = asString(job.data.region);
    if (!region) continue;

    const playerAlbionId =
      asString(job.data.albionId) ?? asString(job.data.playerId);
    const guildAlbionId = asString(job.data.guildId);

    if (playerAlbionId) {
      let set = playersByRegion.get(region);
      if (!set) {
        set = new Set();
        playersByRegion.set(region, set);
      }
      set.add(playerAlbionId);
    }
    if (guildAlbionId) {
      let set = guildsByRegion.get(region);
      if (!set) {
        set = new Set();
        guildsByRegion.set(region, set);
      }
      set.add(guildAlbionId);
    }
  }

  const [playerNames, guildNames] = await Promise.all([
    loadPlayerNames(playersByRegion),
    loadGuildNames(guildsByRegion),
  ]);

  if (playerNames.size === 0 && guildNames.size === 0) return snapshot;

  return {
    ...snapshot,
    jobs: snapshot.jobs.map((job) =>
      enrichJobData(job, playerNames, guildNames)
    ),
  };
}
