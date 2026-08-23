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
import { useSession } from "@/lib/auth-client";
import { getRecentSearches } from "@/lib/search/recent-searches";
import { PREFS_SYNC_FLAG_PREFIX } from "@/lib/prefs-sync-flag";
import { applyPreferredRegionFromServer } from "@/lib/auth-prefs";
import { getPreferredRegion } from "@/lib/region-preference";

export { PREFS_SYNC_FLAG_PREFIX } from "@/lib/prefs-sync-flag";

function readWatchlist(): WatchlistState {
  if (typeof window === "undefined") return { entries: [] };
  return parseWatchlist(localStorage.getItem(WATCHLIST_STORAGE_KEY));
}

function writeWatchlist(state: WatchlistState) {
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(state));
}

async function putWatchlist(entries: WatchlistEntry[]) {
  await fetch("/api/user/prefs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ watchlist: entries }),
  });
}

type SyncLocalResult = {
  watchlist?: WatchlistEntry[];
  preferredRegion?: string | null;
};

/** Shared across every `useWatchlist()` mount (header + feed + watchlist page). */
const inflightSyncLocal = new Map<string, Promise<SyncLocalResult | null>>();

async function syncLocalPrefs(userId: string): Promise<SyncLocalResult | null> {
  const flagKey = `${PREFS_SYNC_FLAG_PREFIX}${userId}`;
  if (typeof window !== "undefined" && sessionStorage.getItem(flagKey) === "1") {
    return null;
  }

  const existing = inflightSyncLocal.get(userId);
  if (existing) return existing;

  const pending = (async () => {
    const res = await fetch("/api/user/sync-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        watchlist: readWatchlist().entries,
        recentSearches: getRecentSearches(),
        preferredRegion: getPreferredRegion(),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SyncLocalResult;
    sessionStorage.setItem(flagKey, "1");
    applyPreferredRegionFromServer(data.preferredRegion);
    return data;
  })().finally(() => {
    inflightSyncLocal.delete(userId);
  });

  inflightSyncLocal.set(userId, pending);
  return pending;
}

export function useWatchlist() {
  const { data: session, isPending: sessionPending } = useSession();
  const userId = session?.user?.id ?? null;
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (sessionPending) return;

    let cancelled = false;

    async function load() {
      if (!userId) {
        if (!cancelled) {
          setEntries(readWatchlist().entries);
          setReady(true);
        }
        return;
      }

      try {
        const synced = await syncLocalPrefs(userId);
        if (synced) {
          if (!cancelled) {
            setEntries(synced.watchlist ?? []);
            setReady(true);
          }
          return;
        }

        const res = await fetch("/api/user/prefs");
        if (!res.ok) throw new Error("prefs failed");
        const data = (await res.json()) as {
          watchlist?: WatchlistEntry[];
          preferredRegion?: string | null;
        };
        applyPreferredRegionFromServer(data.preferredRegion);
        if (!cancelled) {
          setEntries(data.watchlist ?? []);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setEntries(readWatchlist().entries);
          setReady(true);
        }
      }
    }

    setReady(false);
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionPending]);

  const persist = useCallback(
    (next: WatchlistEntry[]) => {
      setEntries(next);
      if (userId) {
        void putWatchlist(next);
      } else {
        writeWatchlist({ entries: next });
      }
    },
    [userId]
  );

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
      const exists = entries.some((entry) => watchlistKey(entry) === key);
      if (exists) {
        persist(entries.filter((entry) => watchlistKey(entry) !== key));
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

  return {
    entries,
    ready,
    isWatching,
    toggle,
    remove,
    signedIn: Boolean(userId),
  };
}
