import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserPreferredRegion,
  getUserRecentSearches,
  getUserWatchlist,
  mergeRecentSearches,
  mergeWatchlistEntries,
  replaceUserRecentSearches,
  replaceUserWatchlist,
  setUserPreferredRegion,
} from "@/lib/db/user-data";
import type { WatchlistEntry } from "@/lib/watchlist";
import type { RecentSearch } from "@/lib/search/recent-searches";
import { isPreferredRegion } from "@/lib/region-preference";

/** Union-merge browser localStorage payload into the signed-in user's server prefs. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    watchlist?: WatchlistEntry[];
    recentSearches?: RecentSearch[];
    preferredRegion?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = session.user.id;
  const [serverWatchlist, serverRecent, serverRegion] = await Promise.all([
    getUserWatchlist(userId),
    getUserRecentSearches(userId),
    getUserPreferredRegion(userId),
  ]);

  const watchlist = Array.isArray(body.watchlist)
    ? await replaceUserWatchlist(
        userId,
        mergeWatchlistEntries(serverWatchlist, body.watchlist)
      )
    : serverWatchlist;

  const recentSearches = Array.isArray(body.recentSearches)
    ? await replaceUserRecentSearches(
        userId,
        mergeRecentSearches(serverRecent, body.recentSearches)
      )
    : serverRecent;

  let preferredRegion = serverRegion;
  if (
    typeof body.preferredRegion === "string" &&
    isPreferredRegion(body.preferredRegion)
  ) {
    // Prefer existing server region; otherwise adopt the device preference.
    preferredRegion = serverRegion
      ? serverRegion
      : await setUserPreferredRegion(userId, body.preferredRegion);
  }

  return NextResponse.json({ watchlist, recentSearches, preferredRegion });
}
