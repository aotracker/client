import "server-only";

import type { AlbionRegion } from "@/lib/albion/types";
import { cachedQuery } from "@/lib/cache";
import {
  getAllianceFeudContentMix,
  getAllianceFeudGuildPairs,
  getAllianceFeudKillsPage,
  getAllianceFeudPageStats,
  getAllianceFeudTopKills,
  getAllianceFeudTopPlayers,
  getGuildFeudContentMix,
  getGuildFeudKillsPage,
  getGuildFeudPageStats,
  getGuildFeudTopKills,
  getGuildFeudTopPlayers,
} from "@/lib/db/queries";
import {
  FEUD_KILLS_PAGE_SIZE,
  type FeudDaysFilter,
} from "@/lib/feud/params";

/** Cross-request TTL for guild/alliance feud SSR bundles. */
export const FEUD_CACHE_REVALIDATE_SECONDS = 45;

async function loadGuildFeudBundle(
  region: AlbionRegion,
  nameA: string,
  nameB: string,
  days: FeudDaysFilter,
  guildAId: string | null | undefined,
  guildBId: string | null | undefined,
  offset: number
) {
  const queryOptions = {
    days,
    guildAId,
    guildBId,
  };

  const [stats, contentMix, topKills, topPlayers, killsPage] =
    await Promise.all([
      getGuildFeudPageStats(region, nameA, nameB, queryOptions),
      getGuildFeudContentMix(region, nameA, nameB, queryOptions),
      getGuildFeudTopKills(region, nameA, nameB, {
        ...queryOptions,
        limit: 10,
      }),
      getGuildFeudTopPlayers(region, nameA, nameB, {
        ...queryOptions,
        limit: 5,
      }),
      getGuildFeudKillsPage(region, nameA, nameB, {
        ...queryOptions,
        limit: FEUD_KILLS_PAGE_SIZE,
        offset,
      }),
    ]);

  return { stats, contentMix, topKills, topPlayers, killsPage, guildPairs: [] };
}

async function loadAllianceFeudBundle(
  region: AlbionRegion,
  idA: string,
  idB: string,
  days: FeudDaysFilter,
  offset: number
) {
  const queryOptions = { days };

  const [stats, contentMix, topKills, topPlayers, killsPage, guildPairs] =
    await Promise.all([
      getAllianceFeudPageStats(region, idA, idB, days),
      getAllianceFeudContentMix(region, idA, idB, days),
      getAllianceFeudTopKills(region, idA, idB, {
        ...queryOptions,
        limit: 10,
      }),
      getAllianceFeudTopPlayers(region, idA, idB, {
        ...queryOptions,
        limit: 5,
      }),
      getAllianceFeudKillsPage(region, idA, idB, {
        ...queryOptions,
        limit: FEUD_KILLS_PAGE_SIZE,
        offset,
      }),
      getAllianceFeudGuildPairs(region, idA, idB, {
        ...queryOptions,
        limit: 8,
      }),
    ]);

  return { stats, contentMix, topKills, topPlayers, killsPage, guildPairs };
}

export const getCachedGuildFeudBundle = cachedQuery(
  loadGuildFeudBundle,
  ["guild-feud-bundle"],
  FEUD_CACHE_REVALIDATE_SECONDS,
  ["feud"]
);

export const getCachedAllianceFeudBundle = cachedQuery(
  loadAllianceFeudBundle,
  ["alliance-feud-bundle"],
  FEUD_CACHE_REVALIDATE_SECONDS,
  ["feud"]
);
