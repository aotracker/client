"use client";

import { useCallback, useEffect, useState } from "react";
import type { AlbionRegion } from "@/lib/albion/types";
import {
  parseWatchlist,
  watchlistKey,
  WATCHLIST_STORAGE_KEY,
  type WatchlistEntry,
  type WatchlistEntityType,
  type WatchlistState,
} from "@/lib/watchlist";

function readWatchlist(): WatchlistState {
  if (typeof window === "undefined") return { entries: [] };
  return parseWatchlist(localStorage.getItem(WATCHLIST_STORAGE_KEY));
}

function writeWatchlist(state: WatchlistState) {
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(state));
}

export function useWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEntries(readWatchlist().entries);
    setReady(true);
  }, []);

  const persist = useCallback((next: WatchlistEntry[]) => {
    setEntries(next);
    writeWatchlist({ entries: next });
  }, []);

  const isWatching = useCallback(
    (type: WatchlistEntityType, region: AlbionRegion, albionId: string) => {
      return entries.some(
        (entry) =>
          entry.type === type &&
          entry.region === region &&
          entry.albionId === albionId
      );
    },
    [entries]
  );

  const toggle = useCallback(
    (
      type: WatchlistEntityType,
      region: AlbionRegion,
      albionId: string,
      name: string
    ) => {
      const key = watchlistKey({ type, region, albionId });
      const exists = entries.some(
        (entry) => watchlistKey(entry) === key
      );
      if (exists) {
        persist(
          entries.filter((entry) => watchlistKey(entry) !== key)
        );
        return false;
      }
      persist([
        ...entries,
        {
          type,
          region,
          albionId,
          name,
          addedAt: new Date().toISOString(),
        },
      ]);
      return true;
    },
    [entries, persist]
  );

  const remove = useCallback(
    (type: WatchlistEntityType, region: AlbionRegion, albionId: string) => {
      const key = watchlistKey({ type, region, albionId });
      persist(entries.filter((entry) => watchlistKey(entry) !== key));
    },
    [entries, persist]
  );

  return { entries, ready, isWatching, toggle, remove };
}
