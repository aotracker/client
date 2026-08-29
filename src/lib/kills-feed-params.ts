import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import type { WatchlistEntry } from "@/lib/watchlist";

export const KILLS_FEED_PAGE_SIZE = 25;
export const MIN_FAME_OPTIONS = [0, 10_000, 25_000, 50_000, 100_000] as const;
/** Victim inventory estimated silver that counts as a juicy kill. */
export const JUICY_MIN_SILVER = 20_000_000;
/** Combined victim gear + loot that gets a highlight on juicy kill cards. */
export const JUICY_HIGHLIGHT_MIN_SILVER = 150_000_000;

/** Juicy loot (20m+) and total estimated victim value over 150m. */
export function isJuicyHighValueKill(
  gearEstSilver?: number | null,
  lootEstSilver?: number | null
): boolean {
  const loot = lootEstSilver != null && lootEstSilver > 0 ? lootEstSilver : 0;
  if (loot < JUICY_MIN_SILVER) return false;
  const gear = gearEstSilver != null && gearEstSilver > 0 ? gearEstSilver : 0;
  return gear + loot > JUICY_HIGHLIGHT_MIN_SILVER;
}

export type WatchlistFeedRef = {
  region: AlbionRegion;
  albionId: string;
};

export function parseMinFame(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(Math.floor(parsed), 10_000_000);
}

export function parseWatchlistFlag(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

export function parseJuicyFlag(value: string | boolean | undefined): boolean {
  return value === true || value === "1" || value === "true";
}

export function parseWatchlistRefs(
  value: string | null | undefined
): WatchlistFeedRef[] {
  if (!value) return [];
  const refs: WatchlistFeedRef[] = [];
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const region = trimmed.slice(0, colon);
    const albionId = trimmed.slice(colon + 1).trim();
    if (!isRegionEnabled(region) || !albionId) continue;
    refs.push({ region, albionId });
  }
  return refs;
}

export function serializeWatchlistRefs(refs: WatchlistFeedRef[]): string {
  return refs.map((ref) => `${ref.region}:${ref.albionId}`).join(",");
}

export function watchlistRefsByType(entries: WatchlistEntry[]): {
  players: WatchlistFeedRef[];
  guilds: WatchlistFeedRef[];
  alliances: WatchlistFeedRef[];
} {
  const players: WatchlistFeedRef[] = [];
  const guilds: WatchlistFeedRef[] = [];
  const alliances: WatchlistFeedRef[] = [];
  for (const entry of entries) {
    const ref = { region: entry.region, albionId: entry.albionId };
    if (entry.type === "player") players.push(ref);
    else if (entry.type === "guild") guilds.push(ref);
    else alliances.push(ref);
  }
  return { players, guilds, alliances };
}
