import { cache } from "react";
import { and, count, desc, eq, gte, inArray, isNotNull, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  LEADERBOARD_CACHE_REVALIDATE_SECONDS,
  cachedQuery,
} from "@/lib/cache";
import { ALL_REGIONS, ENABLED_REGIONS, type AlbionRegion } from "@/lib/albion/types";
import { primeTimeHours } from "@/lib/albion/prime-times";
import { db, schema } from "@/lib/db";
import {
  type ContentTypeFilter,
  type LeaderboardFilters,
  type TopKillerFilters,
  killFamePositiveCondition,
  leaderboardConditions,
} from "./shared";

export interface TopAllianceEntry {
  rank: number;
  killFame: number;
  killCount: number;
  alliance: {
    albionId: string;
    name: string;
    region: AlbionRegion;
  };
}

export interface TopGuildEntry {
  rank: number;
  killFame: number;
  killCount: number;
  uniqueMembers?: number;
  guild: {
    albionId: string;
    name: string;
    region: AlbionRegion;
  };
}

export const GUILD_ACTIVITY_LOOKBACK_DAYS = 30;

export interface GuildHourBucket {
  utcHour: number;
  uniqueMembers: number;
  kills: number;
  deaths: number;
  fame: number;
}

export interface GuildHourActivity {
  days: number;
  hours: GuildHourBucket[];
  peakHour: number | null;
  peakUniqueMembers: number;
  peakPrimeHour: number | null;
  peakPrimeUniqueMembers: number;
}

export interface TopFameEntry {
  rank: number;
  killFame: number;
  killCount: number;
  player: TopKillerEntry["player"];
}

export interface GuildOpponentEntry {
  guildName: string;
  guildAlbionId: string | null;
  killsAgainst: number;
  fameAgainst: number;
  deathsTo: number;
  fameLost: number;
}

export interface TopKillerEntry {
  rank: number;
  killCount: number;
  player: {
    albionId: string;
    name: string;
    region: AlbionRegion;
    guild?: { name: string; albionId?: string } | null;
  };
}

async function loadTopKillers(
  region: AlbionRegion | "all",
  limit: number,
  days: number,
  contentType: ContentTypeFilter
) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conditions = [
    ...leaderboardConditions({ region, days, contentType, limit }, cutoff),
    isNotNull(schema.killEvents.killerId),
  ];

  const rows = await db
    .select({
      killerId: schema.killEvents.killerId,
      killCount: count(),
    })
    .from(schema.killEvents)
    .where(and(...conditions))
    .groupBy(schema.killEvents.killerId)
    .orderBy(desc(count()))
    .limit(limit);

  const killerIds = rows
    .map((r) => r.killerId)
    .filter((id): id is string => id != null);

  if (killerIds.length === 0) return [];

  const players = await db.query.players.findMany({
    where: inArray(schema.players.id, killerIds),
    with: { guild: true },
  });

  const playerById = new Map(players.map((p) => [p.id, p]));

  return rows.reduce<TopKillerEntry[]>((acc, row, index) => {
    if (!row.killerId) return acc;
    const player = playerById.get(row.killerId);
    if (!player) return acc;

    acc.push({
      rank: index + 1,
      killCount: row.killCount,
      player: {
        albionId: player.albionId,
        name: player.name,
        region: player.region,
        guild: player.guild
          ? { name: player.guild.name, albionId: player.guild.albionId }
          : null,
      },
    });
    return acc;
  }, []);
}

const cachedTopKillers = cachedQuery(
  loadTopKillers,
  ["top-killers"],
  LEADERBOARD_CACHE_REVALIDATE_SECONDS,
  ["kills", "leaderboards"]
);

export const getTopKillers = cache(async function getTopKillers(
  filters: TopKillerFilters = {}
) {
  const {
    region = "all",
    limit = 10,
    days = 7,
    contentType = "all",
  } = filters;
  return cachedTopKillers(region, limit, days, contentType);
});

async function loadTopPlayersByKillFame(
  region: AlbionRegion | "all",
  limit: number,
  days: number,
  contentType: ContentTypeFilter
) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conditions = [
    ...leaderboardConditions({ region, days, contentType, limit }, cutoff),
    isNotNull(schema.killEvents.killerId),
  ];

  const rows = await db
    .select({
      killerId: schema.killEvents.killerId,
      killFame: sum(schema.killEvents.totalVictimKillFame),
      killCount: count(),
    })
    .from(schema.killEvents)
    .where(and(...conditions))
    .groupBy(schema.killEvents.killerId)
    .orderBy(desc(sum(schema.killEvents.totalVictimKillFame)))
    .limit(limit);

  const killerIds = rows
    .map((r) => r.killerId)
    .filter((id): id is string => id != null);

  if (killerIds.length === 0) return [];

  const players = await db.query.players.findMany({
    where: inArray(schema.players.id, killerIds),
    with: { guild: true },
  });
  const playerById = new Map(players.map((p) => [p.id, p]));

  return rows.reduce<TopFameEntry[]>((acc, row, index) => {
    if (!row.killerId) return acc;
    const player = playerById.get(row.killerId);
    if (!player) return acc;

    acc.push({
      rank: index + 1,
      killFame: Number(row.killFame ?? 0),
      killCount: row.killCount,
      player: {
        albionId: player.albionId,
        name: player.name,
        region: player.region,
        guild: player.guild
          ? { name: player.guild.name, albionId: player.guild.albionId }
          : null,
      },
    });
    return acc;
  }, []);
}

const cachedTopPlayersByKillFame = cachedQuery(
  loadTopPlayersByKillFame,
  ["top-fame"],
  LEADERBOARD_CACHE_REVALIDATE_SECONDS,
  ["kills", "leaderboards"]
);

export const getTopPlayersByKillFame = cache(async function getTopPlayersByKillFame(
  filters: LeaderboardFilters = {}
) {
  const {
    region = "all",
    limit = 50,
    days = 7,
    contentType = "all",
  } = filters;
  return cachedTopPlayersByKillFame(region, limit, days, contentType);
});

async function loadTopGuildsByHour(
  region: AlbionRegion | "all",
  limit: number,
  days: number,
  contentType: ContentTypeFilter,
  utcHour: number
): Promise<TopGuildEntry[]> {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const memberConditions = [
    eq(schema.guildHourPlayers.utcHour, utcHour),
    gte(schema.guildHourPlayers.utcDate, cutoffDate),
  ];
  const statsConditions = [
    eq(schema.guildHourStats.utcHour, utcHour),
    gte(schema.guildHourStats.utcDate, cutoffDate),
  ];

  if (region !== "all") {
    memberConditions.push(eq(schema.guildHourPlayers.region, region));
    statsConditions.push(eq(schema.guildHourStats.region, region));
  } else if (ENABLED_REGIONS.length === 0) {
    return [];
  } else {
    memberConditions.push(
      inArray(schema.guildHourPlayers.region, ENABLED_REGIONS)
    );
    statsConditions.push(
      inArray(schema.guildHourStats.region, ENABLED_REGIONS)
    );
  }

  if (contentType !== "all") {
    memberConditions.push(
      eq(schema.guildHourPlayers.contentType, contentType)
    );
    statsConditions.push(eq(schema.guildHourStats.contentType, contentType));
  }

  const membersSq = db
    .select({
      region: schema.guildHourPlayers.region,
      guildAlbionId: schema.guildHourPlayers.guildAlbionId,
      uniqueMembers:
        sql<number>`count(distinct ${schema.guildHourPlayers.playerAlbionId})`.as(
          "unique_members"
        ),
    })
    .from(schema.guildHourPlayers)
    .where(and(...memberConditions))
    .groupBy(
      schema.guildHourPlayers.region,
      schema.guildHourPlayers.guildAlbionId
    )
    .as("guild_hour_members");

  const statsSq = db
    .select({
      region: schema.guildHourStats.region,
      guildAlbionId: schema.guildHourStats.guildAlbionId,
      // Ignore ID-as-name fallbacks so MAX() cannot prefer a UUID over a real name.
      guildName: sql<string>`max(nullif(btrim(${schema.guildHourStats.guildName}), ${schema.guildHourStats.guildAlbionId}))`.as(
        "guild_name"
      ),
      killFame: sql<number>`coalesce(sum(${schema.guildHourStats.fame}), 0)`.as(
        "kill_fame"
      ),
      killCount: sql<number>`coalesce(sum(${schema.guildHourStats.kills}), 0)`.as(
        "kill_count"
      ),
    })
    .from(schema.guildHourStats)
    .where(and(...statsConditions))
    .groupBy(schema.guildHourStats.region, schema.guildHourStats.guildAlbionId)
    .as("guild_hour_agg");

  const guildNamesSq = db
    .select({
      region: schema.guilds.region,
      albionId: schema.guilds.albionId,
      name: schema.guilds.name,
    })
    .from(schema.guilds)
    .as("guild_names");

  const rows = await db
    .select({
      region: membersSq.region,
      guildAlbionId: membersSq.guildAlbionId,
      guildName: sql<string>`coalesce(${guildNamesSq.name}, ${statsSq.guildName})`.as(
        "resolved_guild_name"
      ),
      uniqueMembers: membersSq.uniqueMembers,
      killFame: sql<number>`${statsSq.killFame}`.as("kill_fame"),
      killCount: sql<number>`${statsSq.killCount}`.as("kill_count"),
    })
    .from(membersSq)
    .leftJoin(
      statsSq,
      and(
        eq(membersSq.region, statsSq.region),
        eq(membersSq.guildAlbionId, statsSq.guildAlbionId)
      )
    )
    .leftJoin(
      guildNamesSq,
      and(
        eq(guildNamesSq.region, membersSq.region),
        eq(guildNamesSq.albionId, membersSq.guildAlbionId)
      )
    )
    .orderBy(
      desc(membersSq.uniqueMembers),
      sql`${statsSq.killFame} DESC NULLS LAST`
    )
    .limit(limit);

  return rows.reduce<TopGuildEntry[]>((acc, row, index) => {
    const albionId = row.guildAlbionId?.trim();
    const name = row.guildName?.trim() || albionId;
    if (!albionId || !name) return acc;

    acc.push({
      rank: index + 1,
      killFame: Number(row.killFame ?? 0),
      killCount: Number(row.killCount ?? 0),
      uniqueMembers: Number(row.uniqueMembers ?? 0),
      guild: {
        albionId,
        name,
        region: row.region,
      },
    });
    return acc;
  }, []);
}

/**
 * Prefer time-leading covering indexes (`kill_events_lb_guild_idx`) over
 * `kill_events_region_occurred_fame_idx`. Skip a redundant region IN when
 * every Albion region is enabled; do not filter killer_id (not in INCLUDE).
 */
function coveringLeaderboardConditions(
  filters: {
    region: AlbionRegion | "all";
    contentType: ContentTypeFilter;
  },
  cutoff: Date
) {
  const { region, contentType } = filters;
  const conditions = [
    killFamePositiveCondition(),
    gte(schema.killEvents.occurredAt, cutoff),
  ];
  if (region !== "all") {
    conditions.push(eq(schema.killEvents.region, region));
  } else if (ENABLED_REGIONS.length === 0) {
    conditions.push(sql`false`);
  } else if (ENABLED_REGIONS.length < ALL_REGIONS.length) {
    conditions.push(inArray(schema.killEvents.region, ENABLED_REGIONS));
  }
  if (contentType !== "all") {
    conditions.push(eq(schema.killEvents.contentType, contentType));
  }
  return conditions;
}

async function loadTopGuildsByKillFame(
  region: AlbionRegion | "all",
  limit: number,
  days: number,
  contentType: ContentTypeFilter,
  utcHour: number | null
) {
  if (utcHour != null) {
    return loadTopGuildsByHour(region, limit, days, contentType, utcHour);
  }
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conditions = [
    ...coveringLeaderboardConditions({ region, contentType }, cutoff),
    isNotNull(schema.killEvents.killerGuildAlbionId),
  ];

  const rows = await db
    .select({
      region: schema.killEvents.region,
      guildAlbionId: schema.killEvents.killerGuildAlbionId,
      guildName: sql<string>`max(${schema.killEvents.killerGuildName})`.as(
        "guild_name"
      ),
      killFame: sum(schema.killEvents.totalVictimKillFame),
      killCount: count(),
    })
    .from(schema.killEvents)
    .where(and(...conditions))
    .groupBy(
      schema.killEvents.region,
      schema.killEvents.killerGuildAlbionId
    )
    .orderBy(desc(sum(schema.killEvents.totalVictimKillFame)))
    .limit(limit);

  return rows.reduce<TopGuildEntry[]>((acc, row, index) => {
    const albionId = row.guildAlbionId?.trim();
    const name = row.guildName?.trim();
    if (!albionId || !name) return acc;

    acc.push({
      rank: index + 1,
      killFame: Number(row.killFame ?? 0),
      killCount: row.killCount,
      guild: {
        albionId,
        name,
        region: row.region,
      },
    });
    return acc;
  }, []);
}

const cachedTopGuildsByKillFame = cachedQuery(
  loadTopGuildsByKillFame,
  ["top-guilds", "hour-names"],
  LEADERBOARD_CACHE_REVALIDATE_SECONDS,
  ["kills", "leaderboards"]
);

async function loadTopAlliancesByKillFame(
  region: AlbionRegion | "all",
  limit: number,
  days: number,
  contentType: ContentTypeFilter
) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conditions = [
    ...coveringLeaderboardConditions({ region, contentType }, cutoff),
    isNotNull(schema.killEvents.killerAllianceAlbionId),
  ];

  const rows = await db
    .select({
      region: schema.killEvents.region,
      allianceAlbionId: schema.killEvents.killerAllianceAlbionId,
      allianceName: sql<string>`max(${schema.killEvents.killerAllianceName})`.as(
        "alliance_name"
      ),
      killFame: sum(schema.killEvents.totalVictimKillFame),
      killCount: count(),
    })
    .from(schema.killEvents)
    .where(and(...conditions))
    .groupBy(
      schema.killEvents.region,
      schema.killEvents.killerAllianceAlbionId
    )
    .orderBy(desc(sum(schema.killEvents.totalVictimKillFame)))
    .limit(limit);

  return rows.reduce<TopAllianceEntry[]>((acc, row, index) => {
    const albionId = row.allianceAlbionId?.trim();
    const name = row.allianceName?.trim();
    if (!albionId || !name) return acc;

    acc.push({
      rank: index + 1,
      killFame: Number(row.killFame ?? 0),
      killCount: row.killCount,
      alliance: {
        albionId,
        name,
        region: row.region,
      },
    });
    return acc;
  }, []);
}

const cachedTopAlliancesByKillFame = cachedQuery(
  loadTopAlliancesByKillFame,
  ["top-alliances"],
  LEADERBOARD_CACHE_REVALIDATE_SECONDS,
  ["kills", "leaderboards"]
);

export const getTopAlliancesByKillFame = cache(
  async function getTopAlliancesByKillFame(filters: LeaderboardFilters = {}) {
    const { region = "all", limit = 50, days = 7, contentType = "all" } =
      filters;
    return cachedTopAlliancesByKillFame(region, limit, days, contentType);
  }
);

export const getTopGuildsByKillFame = cache(async function getTopGuildsByKillFame(
  filters: LeaderboardFilters = {}
) {
  const {
    region = "all",
    limit = 50,
    days = 7,
    contentType = "all",
    utcHour,
  } = filters;
  return cachedTopGuildsByKillFame(
    region,
    limit,
    days,
    contentType,
    utcHour ?? null
  );
});

export async function getGuildHourActivity(
  region: AlbionRegion,
  guildAlbionId: string,
  days = GUILD_ACTIVITY_LOOKBACK_DAYS
): Promise<GuildHourActivity> {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const guildId = guildAlbionId.trim();
  if (!guildId) {
    return {
      days,
      hours: [],
      peakHour: null,
      peakUniqueMembers: 0,
      peakPrimeHour: null,
      peakPrimeUniqueMembers: 0,
    };
  }

  const memberWhere = and(
    eq(schema.guildHourPlayers.region, region),
    eq(schema.guildHourPlayers.guildAlbionId, guildId),
    gte(schema.guildHourPlayers.utcDate, cutoffDate)
  );
  const statsWhere = and(
    eq(schema.guildHourStats.region, region),
    eq(schema.guildHourStats.guildAlbionId, guildId),
    gte(schema.guildHourStats.utcDate, cutoffDate)
  );

  const [memberRows, statsRows] = await Promise.all([
    db
      .select({
        utcHour: schema.guildHourPlayers.utcHour,
        uniqueMembers:
          sql<number>`count(distinct ${schema.guildHourPlayers.playerAlbionId})`.as(
            "unique_members"
          ),
      })
      .from(schema.guildHourPlayers)
      .where(memberWhere)
      .groupBy(schema.guildHourPlayers.utcHour),
    db
      .select({
        utcHour: schema.guildHourStats.utcHour,
        kills: sql<number>`coalesce(sum(${schema.guildHourStats.kills}), 0)`.as(
          "kills"
        ),
        deaths: sql<number>`coalesce(sum(${schema.guildHourStats.deaths}), 0)`.as(
          "deaths"
        ),
        fame: sql<number>`coalesce(sum(${schema.guildHourStats.fame}), 0)`.as(
          "fame"
        ),
      })
      .from(schema.guildHourStats)
      .where(statsWhere)
      .groupBy(schema.guildHourStats.utcHour),
  ]);

  const statsByHour = new Map(
    statsRows.map((row) => [
      row.utcHour,
      {
        kills: Number(row.kills ?? 0),
        deaths: Number(row.deaths ?? 0),
        fame: Number(row.fame ?? 0),
      },
    ])
  );

  const hours: GuildHourBucket[] = memberRows
    .map((row) => {
      const extras = statsByHour.get(row.utcHour);
      return {
        utcHour: row.utcHour,
        uniqueMembers: Number(row.uniqueMembers ?? 0),
        kills: extras?.kills ?? 0,
        deaths: extras?.deaths ?? 0,
        fame: extras?.fame ?? 0,
      };
    })
    .sort((a, b) => a.utcHour - b.utcHour);

  const ranked = [...hours].sort(
    (a, b) => b.uniqueMembers - a.uniqueMembers || b.fame - a.fame
  );
  const peak = ranked[0];
  const ptHours = new Set(primeTimeHours(region));
  const peakPrime = ranked.find(
    (row) => ptHours.has(row.utcHour) && row.uniqueMembers > 0
  );
  return {
    days,
    hours,
    peakHour: peak ? peak.utcHour : null,
    peakUniqueMembers: peak ? peak.uniqueMembers : 0,
    peakPrimeHour: peakPrime ? peakPrime.utcHour : null,
    peakPrimeUniqueMembers: peakPrime ? peakPrime.uniqueMembers : 0,
  };
}

export async function getGuildTopOpponents(
  region: AlbionRegion,
  guildName: string,
  options: { days?: number; limit?: number } = {}
) {
  const { days = 30, limit = 10 } = options;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const nameLower = guildName.trim().toLowerCase();
  if (!nameLower) return [];

  const killerPart = alias(schema.killParticipants, "rival_killer");
  const victimPart = alias(schema.killParticipants, "rival_victim");

  const [killsAgainstRows, deathsToRows] = await Promise.all([
    db
      .select({
        guildName: victimPart.guildName,
        guildAlbionId: sql<string | null>`${victimPart.rawPayload}->>'GuildId'`,
        count: count(),
        fame: sum(schema.killEvents.totalVictimKillFame),
      })
      .from(schema.killEvents)
      .innerJoin(
        killerPart,
        and(
          eq(killerPart.eventId, schema.killEvents.id),
          eq(killerPart.role, "killer"),
          sql`lower(trim(${killerPart.guildName})) = ${nameLower}`
        )
      )
      .innerJoin(
        victimPart,
        and(
          eq(victimPart.eventId, schema.killEvents.id),
          eq(victimPart.role, "victim"),
          isNotNull(victimPart.guildName),
          sql`lower(trim(${victimPart.guildName})) <> ${nameLower}`
        )
      )
      .where(
        and(
          eq(schema.killEvents.region, region),
          killFamePositiveCondition(),
          gte(schema.killEvents.occurredAt, cutoff)
        )
      )
      .groupBy(victimPart.guildName, sql`${victimPart.rawPayload}->>'GuildId'`),
    db
      .select({
        guildName: killerPart.guildName,
        guildAlbionId: sql<string | null>`${killerPart.rawPayload}->>'GuildId'`,
        count: count(),
        fame: sum(schema.killEvents.totalVictimKillFame),
      })
      .from(schema.killEvents)
      .innerJoin(
        victimPart,
        and(
          eq(victimPart.eventId, schema.killEvents.id),
          eq(victimPart.role, "victim"),
          sql`lower(trim(${victimPart.guildName})) = ${nameLower}`
        )
      )
      .innerJoin(
        killerPart,
        and(
          eq(killerPart.eventId, schema.killEvents.id),
          eq(killerPart.role, "killer"),
          isNotNull(killerPart.guildName),
          sql`lower(trim(${killerPart.guildName})) <> ${nameLower}`
        )
      )
      .where(
        and(
          eq(schema.killEvents.region, region),
          killFamePositiveCondition(),
          gte(schema.killEvents.occurredAt, cutoff)
        )
      )
      .groupBy(killerPart.guildName, sql`${killerPart.rawPayload}->>'GuildId'`),
  ]);

  const merged = new Map<string, GuildOpponentEntry>();

  for (const row of killsAgainstRows) {
    const name = row.guildName?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = merged.get(key) ?? {
      guildName: name,
      guildAlbionId: row.guildAlbionId?.trim() ?? null,
      killsAgainst: 0,
      fameAgainst: 0,
      deathsTo: 0,
      fameLost: 0,
    };
    existing.killsAgainst += row.count;
    existing.fameAgainst += Number(row.fame ?? 0);
    if (row.guildAlbionId?.trim()) {
      existing.guildAlbionId = row.guildAlbionId.trim();
    }
    merged.set(key, existing);
  }

  for (const row of deathsToRows) {
    const name = row.guildName?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = merged.get(key) ?? {
      guildName: name,
      guildAlbionId: row.guildAlbionId?.trim() ?? null,
      killsAgainst: 0,
      fameAgainst: 0,
      deathsTo: 0,
      fameLost: 0,
    };
    existing.deathsTo += row.count;
    existing.fameLost += Number(row.fame ?? 0);
    if (row.guildAlbionId?.trim()) {
      existing.guildAlbionId = row.guildAlbionId.trim();
    }
    merged.set(key, existing);
  }

  return [...merged.values()]
    .sort(
      (a, b) =>
        b.fameAgainst + b.fameLost - (a.fameAgainst + a.fameLost) ||
        b.killsAgainst + b.deathsTo - (a.killsAgainst + a.deathsTo)
    )
    .slice(0, limit);
}
