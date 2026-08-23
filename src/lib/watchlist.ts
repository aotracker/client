import type { AlbionRegion } from "@/lib/albion/types";
import { alliancePath, guildPath, playerPath } from "@/lib/seo";

export const WATCHLIST_STORAGE_KEY = "aotrackr-watchlist-v1";

export type WatchlistEntityType = "player" | "guild" | "alliance";

export interface WatchlistEntry {
  type: WatchlistEntityType;
  region: AlbionRegion;
  albionId: string;
  name: string;
  addedAt: string;
}

export interface WatchlistState {
  entries: WatchlistEntry[];
}

const WATCHLIST_TYPES = new Set<WatchlistEntityType>([
  "player",
  "guild",
  "alliance",
]);

export function parseWatchlist(raw: string | null): WatchlistState {
  if (!raw) return { entries: [] };
  try {
    const parsed = JSON.parse(raw) as WatchlistState;
    if (!parsed?.entries || !Array.isArray(parsed.entries)) {
      return { entries: [] };
    }
    return {
      entries: parsed.entries.filter(
        (entry) =>
          entry &&
          WATCHLIST_TYPES.has(entry.type) &&
          typeof entry.region === "string" &&
          typeof entry.albionId === "string" &&
          typeof entry.name === "string"
      ),
    };
  } catch {
    return { entries: [] };
  }
}

export function watchlistKey(entry: Pick<WatchlistEntry, "type" | "region" | "albionId">) {
  return `${entry.type}:${entry.region}:${entry.albionId}`;
}

/** Keep one row per (type, region, albionId); earlier `addedAt` wins. */
export function uniqueWatchlistEntries(entries: WatchlistEntry[]): WatchlistEntry[] {
  const map = new Map<string, WatchlistEntry>();
  for (const entry of entries) {
    const key = watchlistKey(entry);
    const existing = map.get(key);
    if (
      !existing ||
      new Date(entry.addedAt).getTime() < new Date(existing.addedAt).getTime()
    ) {
      map.set(key, entry);
    }
  }
  return Array.from(map.values());
}

export function entityHref(entry: WatchlistEntry): string {
  if (entry.type === "player") return playerPath(entry.region, entry.name);
  if (entry.type === "guild") return guildPath(entry.region, entry.name);
  return alliancePath(entry.region, entry.albionId);
}
