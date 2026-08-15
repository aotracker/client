import { and, count, desc, eq, gte, inArray, sum } from "drizzle-orm";
import {
  BUILDS_CACHE_REVALIDATE_SECONDS,
  cachedQuery,
} from "@/lib/cache";
import {
  buildPresentation,
  decorateBuildItem,
  itemDisplayNames,
  itemFamilyNames,
} from "@/lib/items/build-display";
import type { ArmorClass } from "@/lib/items/item-meta";
import type { WeaponRole } from "@/lib/items/weapon-roles";
import type { AlbionRegion, ContentType } from "@/lib/albion/types";
import { canonicalizeItemType, itemFamilyKey } from "@/lib/item-icons";
import { db, schema } from "@/lib/db";
import {
  type PlayerBuildItem,
  type PlayerContentMixEntry,
  buildFingerprint,
  canonicalizeBuildItems,
  extractBuildItemsFromParticipantPayload,
  getMainHandItem,
  isSparseBuild,
  killFamePositiveCondition,
  preferBuildItems,
  regionCondition,
} from "./shared";

export interface MetaBuildItem {
  slot: string;
  itemType: string;
  quality: number;
  displayNames?: Record<string, string>;
  familyNames?: Record<string, string>;
}

export interface MetaBuildEntry {
  rank: number;
  kills: number;
  deaths: number;
  assists: number;
  appearances: number;
  totalFame: number;
  avgFame: number;
  avgIp: number;
  uniquePlayers: number;
  avgParticipantCount: number;
  items: MetaBuildItem[];
  titleNames: Record<string, string>;
  weaponRole: WeaponRole | null;
  armorClass: ArmorClass | null;
}

export interface MetaWeaponEntry {
  itemType: string;
  appearances: number;
  kills: number;
  assists: number;
  usesByContentType: Record<ContentType, number>;
  displayNames: Record<string, string>;
  familyNames: Record<string, string>;
  weaponRole: WeaponRole | null;
}

export interface MetaBuildsResult {
  windowDays: number;
  totalEvents: number;
  totalAppearances: number;
  totalFame: number;
  uniqueBuilds: number;
  contentMix: PlayerContentMixEntry[];
  byContentType: Record<ContentType, MetaBuildEntry[]>;
  topWeapons: MetaWeaponEntry[];
}

type MetaBuildRole = "killer" | "victim" | "assist";

interface MetaBuildSample {
  contentType: ContentType;
  role: MetaBuildRole;
  fame: number;
  ip: number;
  participantCount: number;
  playerId: string | null;
  items: PlayerBuildItem[];
}

interface MetaBuildAccumulator {
  kills: number;
  deaths: number;
  assists: number;
  totalFame: number;
  ipSum: number;
  ipSamples: number;
  participantSum: number;
  players: Set<string>;
  items: PlayerBuildItem[];
}

const META_BUILD_CONTENT_TYPES: ContentType[] = ["SOLO", "GROUP", "ZVZ"];
/** Higher than killer/victim-only sampling — ZvZ assists multiply rows per event. */
const META_BUILD_SAMPLE_PER_TYPE = 12_000;
const META_BUILDS_PER_TYPE = 12;
const META_TOP_WEAPONS = 8;
/** Top weapons considered per content type before merging duplicates. */
const META_TOP_WEAPONS_PER_TYPE = 4;

const META_ROLE_PRIORITY: Record<MetaBuildRole, number> = {
  killer: 3,
  victim: 2,
  assist: 1,
};

function normalizeMetaBuildRole(
  role: "killer" | "victim" | "group_member" | "participant"
): MetaBuildRole {
  if (role === "killer" || role === "victim") return role;
  return "assist";
}

function preferMetaBuildRole(
  current: MetaBuildRole,
  candidate: MetaBuildRole
): MetaBuildRole {
  return META_ROLE_PRIORITY[candidate] > META_ROLE_PRIORITY[current]
    ? candidate
    : current;
}

function emptyMetaBuildAccumulator(items: PlayerBuildItem[]): MetaBuildAccumulator {
  return {
    kills: 0,
    deaths: 0,
    assists: 0,
    totalFame: 0,
    ipSum: 0,
    ipSamples: 0,
    participantSum: 0,
    players: new Set(),
    items,
  };
}

function aggregateMetaBuilds(
  samples: MetaBuildSample[],
  limit: number
): MetaBuildEntry[] {
  const fullByWeapon = new Map<string, PlayerBuildItem[]>();

  for (const sample of samples) {
    if (isSparseBuild(sample.items)) continue;
    const mainHand = getMainHandItem(sample.items);
    if (!mainHand) continue;
    const weaponKey = itemFamilyKey(mainHand.itemType);
    const existing = fullByWeapon.get(weaponKey);
    if (!existing) {
      fullByWeapon.set(weaponKey, sample.items);
    } else {
      fullByWeapon.set(weaponKey, preferBuildItems(existing, sample.items));
    }
  }

  const byFingerprint = new Map<string, MetaBuildAccumulator>();

  for (const sample of samples) {
    let resolved = sample.items;
    if (isSparseBuild(sample.items)) {
      const mainHand = getMainHandItem(sample.items);
      const full = mainHand
        ? fullByWeapon.get(itemFamilyKey(mainHand.itemType))
        : undefined;
      if (full) resolved = full;
    }

    const key = buildFingerprint(resolved);
    if (!key) continue;

    const existing = byFingerprint.get(key);
    const acc = existing ?? emptyMetaBuildAccumulator(resolved);
    if (!existing) byFingerprint.set(key, acc);

    acc.items = preferBuildItems(acc.items, resolved);
    acc.participantSum += sample.participantCount;
    if (sample.playerId) acc.players.add(sample.playerId);
    if (sample.ip > 0) {
      acc.ipSum += sample.ip;
      acc.ipSamples += 1;
    }

    if (sample.role === "killer") {
      acc.kills += 1;
      acc.totalFame += sample.fame;
    } else if (sample.role === "victim") {
      acc.deaths += 1;
    } else {
      acc.assists += 1;
    }
  }

  return [...byFingerprint.values()]
    .map((acc) => {
      const appearances = acc.kills + acc.deaths + acc.assists;
      return {
        kills: acc.kills,
        deaths: acc.deaths,
        assists: acc.assists,
        appearances,
        totalFame: acc.totalFame,
        avgFame: acc.kills > 0 ? acc.totalFame / acc.kills : 0,
        avgIp: acc.ipSamples > 0 ? acc.ipSum / acc.ipSamples : 0,
        uniquePlayers: acc.players.size,
        avgParticipantCount:
          appearances > 0 ? acc.participantSum / appearances : 0,
        items: canonicalizeBuildItems(acc.items),
      };
    })
    .sort(
      (a, b) =>
        b.appearances - a.appearances ||
        b.uniquePlayers - a.uniquePlayers ||
        b.kills - a.kills ||
        b.totalFame - a.totalFame
    )
    .slice(0, limit)
    .map((entry, index) => {
      const items = entry.items.map(decorateBuildItem);
      return {
        ...entry,
        rank: index + 1,
        items,
        ...buildPresentation(items),
      };
    });
}

/**
 * Global build meta from recent kill participants (killers, victims, and
 * assists), split by content type. Ranked by usage so support/tank/healer
 * loadouts surface even without last-hits. Same weapons/gear across tiers
 * are combined (matches player analytics).
 */
async function loadMetaBuilds(
  region: AlbionRegion | "all",
  days: number,
  limitPerType: number
): Promise<MetaBuildsResult> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [contentMixRows, ...sampleRowGroups] = await Promise.all([
    db
      .select({
        contentType: schema.killEvents.contentType,
        count: count(),
        fame: sum(schema.killEvents.totalVictimKillFame),
      })
      .from(schema.killEvents)
      .where(
        and(
          gte(schema.killEvents.occurredAt, cutoff),
          killFamePositiveCondition(),
          regionCondition(region)
        )
      )
      .groupBy(schema.killEvents.contentType),
    ...META_BUILD_CONTENT_TYPES.map((contentType) =>
      db
        .select({
          eventId: schema.killEvents.id,
          contentType: schema.killEvents.contentType,
          role: schema.killParticipants.role,
          fame: schema.killEvents.totalVictimKillFame,
          ip: schema.killParticipants.averageItemPower,
          participantCount: schema.killEvents.participantCount,
          playerId: schema.killParticipants.playerId,
          rawPayload: schema.killParticipants.rawPayload,
        })
        .from(schema.killParticipants)
        .innerJoin(
          schema.killEvents,
          eq(schema.killEvents.id, schema.killParticipants.eventId)
        )
        .where(
          and(
            gte(schema.killEvents.occurredAt, cutoff),
            eq(schema.killEvents.contentType, contentType),
            killFamePositiveCondition(),
            regionCondition(region),
            inArray(schema.killParticipants.role, [
              "killer",
              "victim",
              "group_member",
              "participant",
            ])
          )
        )
        .orderBy(desc(schema.killEvents.occurredAt))
        .limit(META_BUILD_SAMPLE_PER_TYPE)
    ),
  ]);

  const byContentType = {
    SOLO: [] as MetaBuildEntry[],
    GROUP: [] as MetaBuildEntry[],
    ZVZ: [] as MetaBuildEntry[],
  };
  const weaponCounts = new Map<
    string,
    {
      itemType: string;
      appearances: number;
      kills: number;
      assists: number;
      contentType: ContentType;
    }
  >();
  let uniqueBuilds = 0;
  let totalAppearances = 0;

  for (let i = 0; i < META_BUILD_CONTENT_TYPES.length; i++) {
    const contentType = META_BUILD_CONTENT_TYPES[i];
    const rows = sampleRowGroups[i] ?? [];
    /** One loadout per player per event (killer/victim/assist overlap). */
    const byPlayerEvent = new Map<string, MetaBuildSample>();

    for (const row of rows) {
      if (
        row.role !== "killer" &&
        row.role !== "victim" &&
        row.role !== "group_member" &&
        row.role !== "participant"
      ) {
        continue;
      }

      const items = extractBuildItemsFromParticipantPayload(row.rawPayload);
      if (items.length === 0) continue;

      const role = normalizeMetaBuildRole(row.role);
      const dedupeKey = row.playerId
        ? `${row.eventId}:${row.playerId}`
        : `${row.eventId}:${role}:${buildFingerprint(items)}`;
      const existing = byPlayerEvent.get(dedupeKey);

      if (existing) {
        existing.items = preferBuildItems(existing.items, items);
        existing.role = preferMetaBuildRole(existing.role, role);
        if (Number(row.ip ?? 0) > existing.ip) {
          existing.ip = Number(row.ip ?? 0);
        }
        continue;
      }

      byPlayerEvent.set(dedupeKey, {
        contentType,
        role,
        fame: Number(row.fame ?? 0),
        ip: Number(row.ip ?? 0),
        participantCount: Number(row.participantCount ?? 0),
        playerId: row.playerId,
        items,
      });
    }

    const samples = [...byPlayerEvent.values()];
    totalAppearances += samples.length;

    for (const sample of samples) {
      const mainHand = getMainHandItem(sample.items);
      if (!mainHand) continue;
      const family = itemFamilyKey(mainHand.itemType);
      const weaponKey = `${contentType}:${family}`;
      const existing = weaponCounts.get(weaponKey);
      if (existing) {
        existing.appearances += 1;
        if (sample.role === "killer") existing.kills += 1;
        if (sample.role === "assist") existing.assists += 1;
      } else {
        weaponCounts.set(weaponKey, {
          itemType: canonicalizeItemType(mainHand.itemType),
          appearances: 1,
          kills: sample.role === "killer" ? 1 : 0,
          assists: sample.role === "assist" ? 1 : 0,
          contentType,
        });
      }
    }

    const builds = aggregateMetaBuilds(samples, limitPerType);
    byContentType[contentType] = builds;
    uniqueBuilds += builds.length;
  }

  const contentMix: PlayerContentMixEntry[] = contentMixRows.map((row) => ({
    contentType: row.contentType,
    count: Number(row.count),
  }));

  const totalEvents = contentMix.reduce((sum, entry) => sum + entry.count, 0);
  const totalFame = contentMixRows.reduce(
    (sum, row) => sum + Number(row.fame ?? 0),
    0
  );

  const contentTypeOrder: ContentType[] = ["SOLO", "GROUP", "ZVZ"];
  const emptyUsesByType = (): Record<ContentType, number> => ({
    SOLO: 0,
    GROUP: 0,
    ZVZ: 0,
  });

  const mergedWeapons = new Map<
    string,
    {
      itemType: string;
      appearances: number;
      kills: number;
      assists: number;
      usesByContentType: Record<ContentType, number>;
    }
  >();

  for (const entry of weaponCounts.values()) {
    const family = itemFamilyKey(entry.itemType);
    const existing = mergedWeapons.get(family);
    if (existing) {
      existing.appearances += entry.appearances;
      existing.kills += entry.kills;
      existing.assists += entry.assists;
      existing.usesByContentType[entry.contentType] += entry.appearances;
    } else {
      const usesByContentType = emptyUsesByType();
      usesByContentType[entry.contentType] = entry.appearances;
      mergedWeapons.set(family, {
        itemType: entry.itemType,
        appearances: entry.appearances,
        kills: entry.kills,
        assists: entry.assists,
        usesByContentType,
      });
    }
  }

  const candidateFamilies = new Set<string>();
  for (const contentType of contentTypeOrder) {
    const inType = [...weaponCounts.values()]
      .filter((entry) => entry.contentType === contentType)
      .sort(
        (a, b) =>
          b.appearances - a.appearances ||
          b.kills - a.kills
      )
      .slice(0, META_TOP_WEAPONS_PER_TYPE);

    for (const entry of inType) {
      candidateFamilies.add(itemFamilyKey(entry.itemType));
    }
  }

  const maxUsesInAnyType = (uses: Record<ContentType, number>) =>
    Math.max(uses.SOLO, uses.GROUP, uses.ZVZ);

  const topWeapons: MetaWeaponEntry[] = [...mergedWeapons.entries()]
    .filter(([family]) => candidateFamilies.has(family))
    .map(([, entry]) => ({
      itemType: entry.itemType,
      appearances: entry.appearances,
      kills: entry.kills,
      assists: entry.assists,
      usesByContentType: entry.usesByContentType,
      displayNames: itemDisplayNames(entry.itemType),
      familyNames: itemFamilyNames(entry.itemType),
      weaponRole: buildPresentation([{ slot: "MainHand", itemType: entry.itemType }])
        .weaponRole,
    }))
    .sort(
      (a, b) =>
        maxUsesInAnyType(b.usesByContentType) -
          maxUsesInAnyType(a.usesByContentType) ||
        b.appearances - a.appearances ||
        b.kills - a.kills
    )
    .slice(0, META_TOP_WEAPONS);

  return {
    windowDays: days,
    totalEvents,
    totalAppearances,
    totalFame,
    uniqueBuilds,
    contentMix,
    byContentType,
    topWeapons,
  };
}

const cachedMetaBuilds = cachedQuery(
  loadMetaBuilds,
  ["meta-builds"],
  BUILDS_CACHE_REVALIDATE_SECONDS,
  ["builds"]
);

export async function getMetaBuilds(options?: {
  region?: AlbionRegion | "all";
  days?: number;
  limitPerType?: number;
}): Promise<MetaBuildsResult> {
  const region = options?.region ?? "all";
  const days = Math.min(Math.max(options?.days ?? 30, 1), 30);
  const limitPerType = options?.limitPerType ?? META_BUILDS_PER_TYPE;
  return cachedMetaBuilds(region, days, limitPerType);
}
