import type {
  AlbionBattle,
  AlbionBattleAllianceStats,
  AlbionBattleGuildStats,
  AlbionBattlePlayer,
  AlbionEvent,
  AlbionPlayerRef,
  GuildBattleSummary,
} from "./types";
import { isSyncStale } from "../db/sync";
import { BATTLES_FEED_PREVIEW_LIMIT } from "../battles-constants";

function sortByFameThenKills<T extends { killFame: number; kills: number }>(
  items: T[]
): T[] {
  return [...items].sort(
    (a, b) => b.killFame - a.killFame || b.kills - a.kills
  );
}

function battleGuildPreview(battle: AlbionBattle): {
  guilds: { id: string; name: string }[];
  guildCount: number;
} {
  const guilds = sortByFameThenKills(
    battle.guilds ? Object.values(battle.guilds) : []
  );

  return {
    guilds: guilds.slice(0, BATTLES_FEED_PREVIEW_LIMIT).map((g) => ({
      id: g.id,
      name: g.name,
    })),
    guildCount: guilds.length,
  };
}

/** Players in this specific fight. 0/missing Albion list fields are unknown. */
export function resolveBattleTotalPlayers(
  battle: Pick<AlbionBattle, "totalPlayers" | "players" | "guilds" | "alliances">
): number | null {
  if (typeof battle.totalPlayers === "number" && battle.totalPlayers > 0) {
    return battle.totalPlayers;
  }
  if (battle.players) {
    const fromPlayers = Object.keys(battle.players).length;
    if (fromPlayers > 0) return fromPlayers;
  }
  const fromGuilds = sumListedPlayers(battle.guilds);
  if (fromGuilds > 0) return fromGuilds;
  const fromAlliances = sumListedPlayers(battle.alliances);
  if (fromAlliances > 0) return fromAlliances;
  return null;
}

function sumListedPlayers(
  groups?: Record<string, { players?: number }> | null
): number {
  if (!groups) return 0;
  return Object.values(groups).reduce(
    (sum, row) => sum + (typeof row.players === "number" ? row.players : 0),
    0
  );
}

function listedGuildPlayers(
  guilds: AlbionBattle["guilds"],
  guildId: string
): number {
  if (!guilds) return 0;
  const entry = guilds[guildId] ?? Object.values(guilds).find((g) => g.id === guildId);
  return typeof entry?.players === "number" && entry.players > 0 ? entry.players : 0;
}

/** Players from this guild in the fight. Prefer the player list; fall back to guild stats. */
export function countGuildMembersInBattle(
  battle: Pick<AlbionBattle, "players" | "guilds">,
  guildId: string
): number {
  const fromPlayers = battle.players
    ? Object.values(battle.players).filter((player) => player.guildId === guildId)
        .length
    : 0;
  if (fromPlayers > 0) return fromPlayers;
  return listedGuildPlayers(battle.guilds, guildId);
}

export function toGuildBattleSummary(
  battle: AlbionBattle,
  guildId: string
): GuildBattleSummary {
  const guildMembers = countGuildMembersInBattle(battle, guildId);
  const guildEntry =
    battle.guilds?.[guildId] ??
    (battle.guilds
      ? Object.values(battle.guilds).find((g) => g.id === guildId)
      : undefined);
  const guildPreview = battleGuildPreview(battle);

  return {
    id: battle.id ?? battle.albionId ?? 0,
    startTime: battle.startTime ?? null,
    totalFame: battle.totalFame ?? null,
    totalKills: battle.totalKills ?? null,
    totalPlayers: resolveBattleTotalPlayers(battle),
    guildKillFame: guildEntry?.killFame ?? null,
    guildKills: guildEntry?.kills ?? null,
    guildDeaths: guildEntry?.deaths ?? null,
    guildMembers,
    ...guildPreview,
  };
}

export interface BattleEntityParticipation {
  killFame: number | null;
  kills: number | null;
  deaths: number | null;
  members: number;
}

function asStatList<T>(
  value: Record<string, T> | T[] | null | undefined
): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : Object.values(value);
}

/** This alliance's participation in a specific fight. */
export function allianceBattleParticipation(
  battle: {
    alliances?:
      | Record<string, AlbionBattleAllianceStats>
      | AlbionBattleAllianceStats[];
    guilds?: Record<string, AlbionBattleGuildStats> | AlbionBattleGuildStats[];
    players?: Record<string, AlbionBattlePlayer> | AlbionBattlePlayer[];
  },
  allianceId: string
): BattleEntityParticipation {
  const entry = asStatList(battle.alliances).find((row) => row.id === allianceId);
  const fromPlayers = asStatList(battle.players).filter(
    (player) => player.allianceId === allianceId
  ).length;
  const fromGuilds = asStatList(battle.guilds)
    .filter((guild) => guild.allianceId === allianceId)
    .reduce(
      (sum, guild) =>
        sum + (typeof guild.players === "number" ? guild.players : 0),
      0
    );
  const members =
    fromPlayers > 0
      ? fromPlayers
      : typeof entry?.players === "number" && entry.players > 0
        ? entry.players
        : fromGuilds;

  return {
    killFame: entry?.killFame ?? null,
    kills: entry?.kills ?? null,
    deaths: entry?.deaths ?? null,
    members,
  };
}

export function battleAlliancePreview(battle: {
  alliances?:
    | Record<string, AlbionBattleAllianceStats>
    | AlbionBattleAllianceStats[];
}): {
  alliances: { id: string; name: string }[];
  allianceCount: number;
} {
  const alliances = sortByFameThenKills(asStatList(battle.alliances));
  return {
    alliances: alliances.slice(0, BATTLES_FEED_PREVIEW_LIMIT).map((a) => ({
      id: a.id,
      name: a.name,
    })),
    allianceCount: alliances.length,
  };
}

export function toAllianceBattleSummary(
  battle: AlbionBattle,
  allianceId: string
): GuildBattleSummary {
  const participation = allianceBattleParticipation(battle, allianceId);
  const guildPreview = battleGuildPreview(battle);

  return {
    id: battle.id ?? battle.albionId ?? 0,
    startTime: battle.startTime ?? null,
    totalFame: battle.totalFame ?? null,
    totalKills: battle.totalKills ?? null,
    totalPlayers: resolveBattleTotalPlayers(battle),
    guildKillFame: participation.killFame,
    guildKills: participation.kills,
    guildDeaths: participation.deaths,
    guildMembers: participation.members,
    ...guildPreview,
    ...battleAlliancePreview(battle),
  };
}

/** Battles with no kill fame are noise on guild lists (see also `hasKillFame`). */
export function hasBattleKillFame(
  battle: Pick<GuildBattleSummary, "totalFame"> | Pick<AlbionBattle, "totalFame">
): boolean {
  return (battle.totalFame ?? 0) > 0;
}

/** Guild/alliance profile lists need more than one member from that entity. */
export function isMultiMemberGuildBattle(
  battle: Pick<GuildBattleSummary, "guildMembers">
): boolean {
  return battle.guildMembers > 1;
}

export function filterRecentGuildBattles(
  battles: GuildBattleSummary[]
): GuildBattleSummary[] {
  return battles.filter(isMultiMemberGuildBattle);
}

const GUILD_BATTLE_LIST_CACHE_VERSION = 1;

export type GuildBattleListCache = {
  v: typeof GUILD_BATTLE_LIST_CACHE_VERSION;
  battles: GuildBattleSummary[];
};

export function wrapGuildBattleListCache(
  battles: GuildBattleSummary[]
): GuildBattleListCache {
  return { v: GUILD_BATTLE_LIST_CACHE_VERSION, battles };
}

/** Read battles from v1 cache wrapper or legacy raw arrays. */
export function unwrapGuildBattleListCache(
  payload: unknown
): GuildBattleSummary[] | null {
  if (payload == null) return null;
  if (Array.isArray(payload)) return payload as GuildBattleSummary[];
  if (
    typeof payload === "object" &&
    (payload as GuildBattleListCache).v === GUILD_BATTLE_LIST_CACHE_VERSION &&
    Array.isArray((payload as GuildBattleListCache).battles)
  ) {
    return (payload as GuildBattleListCache).battles;
  }
  return null;
}

function battleListMissingGuildPreview(battles: GuildBattleSummary[]): boolean {
  return battles.some(
    (item) =>
      item != null && typeof item === "object" && !("guilds" in item)
  );
}

function battleListMissingAlliancePreview(battles: GuildBattleSummary[]): boolean {
  return battles.some(
    (item) =>
      item != null && typeof item === "object" && !("alliances" in item)
  );
}

/** True when cached battle list should be refetched (null, malformed, or untrusted legacy empty). */
export function isGuildBattleListCacheMissing(
  payload: unknown,
  options?: { counterpartHasBattles?: boolean; requireAlliancePreview?: boolean }
): boolean {
  if (payload == null) return true;

  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return options?.counterpartHasBattles === true;
    }
    const battles = payload as GuildBattleSummary[];
    return (
      battleListMissingGuildPreview(battles) ||
      (options?.requireAlliancePreview === true &&
        battleListMissingAlliancePreview(battles))
    );
  }

  const cached = payload as Partial<GuildBattleListCache>;
  if (
    cached.v !== GUILD_BATTLE_LIST_CACHE_VERSION ||
    !Array.isArray(cached.battles)
  ) {
    return true;
  }

  if (cached.battles.length === 0) return false;

  return (
    battleListMissingGuildPreview(cached.battles) ||
    (options?.requireAlliancePreview === true &&
      battleListMissingAlliancePreview(cached.battles))
  );
}

export function guildBattleListCacheHasBattles(payload: unknown): boolean {
  return (unwrapGuildBattleListCache(payload)?.length ?? 0) > 0;
}

export function canPersistGuildBattleSync(
  topError: string | null,
  recentError: string | null
): boolean {
  return topError == null && recentError == null;
}

/** True when a guild battle list should be refetched (missing, untrusted, or stale). */
export function guildBattleListNeedsRefresh(
  payload: unknown,
  counterpartPayload: unknown,
  battlesLastSyncedAt: Date | null | undefined,
  options?: { force?: boolean; requireAlliancePreview?: boolean }
): boolean {
  if (options?.force) return true;
  if (!battlesLastSyncedAt || isSyncStale(battlesLastSyncedAt)) return true;
  return isGuildBattleListCacheMissing(payload, {
    counterpartHasBattles: guildBattleListCacheHasBattles(counterpartPayload),
    requireAlliancePreview: options?.requireAlliancePreview,
  });
}

/** Both lists are present and trusted (verified empty or populated). */
export function isGuildBattleCacheComplete(
  recentPayload: unknown,
  topPayload: unknown,
  options?: { requireAlliancePreview?: boolean }
): boolean {
  const topHasBattles = guildBattleListCacheHasBattles(topPayload);
  const recentHasBattles = guildBattleListCacheHasBattles(recentPayload);
  return (
    !isGuildBattleListCacheMissing(recentPayload, {
      counterpartHasBattles: topHasBattles,
      requireAlliancePreview: options?.requireAlliancePreview,
    }) &&
    !isGuildBattleListCacheMissing(topPayload, {
      counterpartHasBattles: recentHasBattles,
      requireAlliancePreview: options?.requireAlliancePreview,
    })
  );
}

export function summarizeGuildBattles(
  battles: AlbionBattle[],
  guildId: string
): GuildBattleSummary[] {
  return battles
    .filter(hasBattleKillFame)
    .map((battle) => toGuildBattleSummary(battle, guildId));
}

type PlayerGearLookup = {
  killersAndAssists: Record<string, AlbionPlayerRef>;
  deaths: Record<string, AlbionPlayerRef>;
  groupGear: Record<
    string,
    {
      weaponType: string | null;
      weaponQuality: number | null;
      averageIp: number | null;
    }
  >;
};

function collectParticipantGear(events: AlbionEvent[]): PlayerGearLookup {
  const killersAndAssists: Record<string, AlbionPlayerRef> = {};
  const deaths: Record<string, AlbionPlayerRef> = {};
  const groupGear: PlayerGearLookup["groupGear"] = {};

  for (const event of events) {
    if (event.Killer?.Id) {
      killersAndAssists[event.Killer.Id] = event.Killer;
    }
    if (event.Victim?.Id) {
      deaths[event.Victim.Id] = event.Victim;
    }
    for (const participant of event.Participants ?? []) {
      if (participant.Id) {
        killersAndAssists[participant.Id] = participant;
      }
    }
    for (const member of event.GroupMembers ?? []) {
      if (!member.Id) continue;
      const mainHand = member.Equipment?.MainHand;
      groupGear[member.Id] = {
        weaponType: mainHand?.Type ?? null,
        weaponQuality: mainHand?.Quality ?? null,
        averageIp: member.AverageItemPower ?? null,
      };
    }
  }

  return { killersAndAssists, deaths, groupGear };
}

function getPlayerGear(
  player: AlbionBattlePlayer,
  gear: PlayerGearLookup
): Pick<AlbionBattlePlayer, "weaponType" | "weaponQuality" | "averageIp"> {
  const source =
    player.killFame > 0
      ? gear.killersAndAssists[player.id]
      : gear.deaths[player.id];
  const mainHand = source?.Equipment?.MainHand;
  const fromEvent = {
    weaponType: mainHand?.Type ?? null,
    weaponQuality: mainHand?.Quality ?? null,
    averageIp: source?.AverageItemPower ?? null,
  };
  const fromGroup = gear.groupGear[player.id];

  return {
    weaponType: fromEvent.weaponType ?? fromGroup?.weaponType ?? null,
    weaponQuality: fromEvent.weaponQuality ?? fromGroup?.weaponQuality ?? null,
    averageIp: fromEvent.averageIp ?? fromGroup?.averageIp ?? null,
  };
}

export function enrichBattlePlayers(
  battle: AlbionBattle,
  events: AlbionEvent[]
): AlbionBattlePlayer[] {
  const players = getBattlePlayers(battle);
  if (players.length === 0 || events.length === 0) return players;

  const gear = collectParticipantGear(events);
  return players.map((player) => ({
    ...player,
    ...getPlayerGear(player, gear),
  }));
}

export function enrichBattleGuilds(
  guilds: AlbionBattleGuildStats[],
  players: AlbionBattlePlayer[]
): AlbionBattleGuildStats[] {
  return guilds.map((guild) => {
    const guildPlayers = players.filter((player) => player.guildId === guild.id);
    const playersWithIp = guildPlayers.filter(
      (player) => player.averageIp != null && player.averageIp > 0
    );
    const averageIp =
      playersWithIp.length > 0
        ? Math.round(
            playersWithIp.reduce((sum, player) => sum + (player.averageIp ?? 0), 0) /
              playersWithIp.length
          )
        : null;

    return { ...guild, players: guildPlayers.length, averageIp };
  });
}

export function enrichBattleAlliances(
  alliances: AlbionBattleAllianceStats[],
  players: AlbionBattlePlayer[]
): AlbionBattleAllianceStats[] {
  return alliances.map((alliance) => {
    const alliancePlayers = players.filter(
      (player) => player.allianceId === alliance.id
    );
    const playersWithIp = alliancePlayers.filter(
      (player) => player.averageIp != null && player.averageIp > 0
    );
    const averageIp =
      playersWithIp.length > 0
        ? Math.round(
            playersWithIp.reduce((sum, player) => sum + (player.averageIp ?? 0), 0) /
              playersWithIp.length
          )
        : null;

    return { ...alliance, players: alliancePlayers.length, averageIp };
  });
}

export function getBattleAlliances(battle: AlbionBattle) {
  if (!battle.alliances) return [];

  return Object.values(battle.alliances).sort(
    (a, b) => b.killFame - a.killFame || b.kills - a.kills
  );
}

export function getBattleGuilds(battle: AlbionBattle) {
  if (!battle.guilds) return [];

  return Object.values(battle.guilds).sort(
    (a, b) => b.killFame - a.killFame || b.kills - a.kills
  );
}

export function getBattlePlayers(battle: AlbionBattle) {
  if (!battle.players) return [];

  return Object.values(battle.players).sort(
    (a, b) => b.killFame - a.killFame || b.kills - a.kills
  );
}

export type BattleDetailData = {
  battle: AlbionBattle;
  alliances: AlbionBattleAllianceStats[];
  players: AlbionBattlePlayer[];
  guilds: AlbionBattleGuildStats[];
};

function mergeNumericIp(
  a: number | null | undefined,
  b: number | null | undefined
): number | null {
  if (a != null && a > 0 && b != null && b > 0) {
    return Math.round((a + b) / 2);
  }
  return a != null && a > 0 ? a : b != null && b > 0 ? b : null;
}

function mergePlayers(details: BattleDetailData[]): AlbionBattlePlayer[] {
  const byId = new Map<string, AlbionBattlePlayer>();

  for (const detail of details) {
    for (const player of detail.players) {
      const existing = byId.get(player.id);
      if (!existing) {
        byId.set(player.id, { ...player });
        continue;
      }
      byId.set(player.id, {
        ...existing,
        name: player.name || existing.name,
        kills: existing.kills + player.kills,
        deaths: existing.deaths + player.deaths,
        killFame: existing.killFame + player.killFame,
        guildId: player.guildId ?? existing.guildId,
        guildName: player.guildName ?? existing.guildName,
        allianceId: player.allianceId ?? existing.allianceId,
        allianceName: player.allianceName ?? existing.allianceName,
        weaponType: player.weaponType ?? existing.weaponType,
        weaponQuality: player.weaponQuality ?? existing.weaponQuality,
        averageIp: mergeNumericIp(existing.averageIp, player.averageIp),
      });
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => b.killFame - a.killFame || b.kills - a.kills
  );
}

function mergeGuilds(details: BattleDetailData[]): AlbionBattleGuildStats[] {
  const byId = new Map<string, AlbionBattleGuildStats>();

  for (const detail of details) {
    for (const guild of detail.guilds) {
      const existing = byId.get(guild.id);
      if (!existing) {
        byId.set(guild.id, { ...guild, players: undefined, averageIp: null });
        continue;
      }
      byId.set(guild.id, {
        ...existing,
        name: guild.name || existing.name,
        kills: existing.kills + guild.kills,
        deaths: existing.deaths + guild.deaths,
        killFame: existing.killFame + guild.killFame,
        alliance: guild.alliance ?? existing.alliance,
        allianceId: guild.allianceId ?? existing.allianceId,
      });
    }
  }

  return Array.from(byId.values());
}

function mergeAlliances(
  details: BattleDetailData[]
): AlbionBattleAllianceStats[] {
  const byId = new Map<string, AlbionBattleAllianceStats>();

  for (const detail of details) {
    for (const alliance of detail.alliances) {
      const existing = byId.get(alliance.id);
      if (!existing) {
        byId.set(alliance.id, {
          ...alliance,
          players: undefined,
          averageIp: null,
        });
        continue;
      }
      byId.set(alliance.id, {
        ...existing,
        name: alliance.name || existing.name,
        kills: existing.kills + alliance.kills,
        deaths: existing.deaths + alliance.deaths,
        killFame: existing.killFame + alliance.killFame,
      });
    }
  }

  return Array.from(byId.values());
}

function pickEarliestIso(values: (string | undefined | null)[]): string | undefined {
  let earliest: string | undefined;
  let earliestMs = Number.POSITIVE_INFINITY;
  for (const value of values) {
    if (!value) continue;
    const ms = new Date(value).getTime();
    if (Number.isNaN(ms)) continue;
    if (ms < earliestMs) {
      earliestMs = ms;
      earliest = value;
    }
  }
  return earliest;
}

function pickLatestIso(values: (string | undefined | null)[]): string | undefined {
  let latest: string | undefined;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!value) continue;
    const ms = new Date(value).getTime();
    if (Number.isNaN(ms)) continue;
    if (ms > latestMs) {
      latestMs = ms;
      latest = value;
    }
  }
  return latest;
}

export function mergeBattleDetails(
  details: BattleDetailData[]
): BattleDetailData | null {
  if (details.length === 0) return null;

  const players = mergePlayers(details);
  const guilds = enrichBattleGuilds(mergeGuilds(details), players).sort(
    (a, b) => b.killFame - a.killFame || b.kills - a.kills
  );
  const alliances = enrichBattleAlliances(
    mergeAlliances(details),
    players
  ).sort((a, b) => b.killFame - a.killFame || b.kills - a.kills);

  const totalFame = details.reduce(
    (sum, d) => sum + (d.battle.totalFame ?? 0),
    0
  );
  const totalKills = details.reduce(
    (sum, d) => sum + (d.battle.totalKills ?? 0),
    0
  );

  const battle: AlbionBattle = {
    id: details[0]?.battle.id,
    startTime: pickEarliestIso(details.map((d) => d.battle.startTime)),
    endTime: pickLatestIso(details.map((d) => d.battle.endTime)),
    totalFame,
    totalKills,
    totalPlayers: players.length,
    players: Object.fromEntries(players.map((p) => [p.id, p])),
    guilds: Object.fromEntries(guilds.map((g) => [g.id, g])),
    alliances: Object.fromEntries(alliances.map((a) => [a.id, a])),
  };

  return { battle, players, guilds, alliances };
}
