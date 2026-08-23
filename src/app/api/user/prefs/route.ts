import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserPreferredRegion,
  getUserRecentSearches,
  getUserWatchlist,
  replaceUserRecentSearches,
  replaceUserWatchlist,
  setUserPreferredRegion,
} from "@/lib/db/user-data";
import type { WatchlistEntry } from "@/lib/watchlist";
import type { RecentSearch } from "@/lib/search/recent-searches";
import { isPreferredRegion } from "@/lib/region-preference";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [watchlist, recentSearches, preferredRegion] = await Promise.all([
    getUserWatchlist(session.user.id),
    getUserRecentSearches(session.user.id),
    getUserPreferredRegion(session.user.id),
  ]);

  return NextResponse.json({ watchlist, recentSearches, preferredRegion });
}

export async function PUT(request: Request) {
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

  const result: {
    watchlist?: WatchlistEntry[];
    recentSearches?: RecentSearch[];
    preferredRegion?: string | null;
  } = {};

  if (Array.isArray(body.watchlist)) {
    result.watchlist = await replaceUserWatchlist(
      session.user.id,
      body.watchlist
    );
  }
  if (Array.isArray(body.recentSearches)) {
    result.recentSearches = await replaceUserRecentSearches(
      session.user.id,
      body.recentSearches
    );
  }
  if (body.preferredRegion !== undefined) {
    const next =
      body.preferredRegion === null || body.preferredRegion === ""
        ? null
        : isPreferredRegion(body.preferredRegion)
          ? body.preferredRegion
          : null;
    if (
      body.preferredRegion !== null &&
      body.preferredRegion !== "" &&
      next === null
    ) {
      return NextResponse.json(
        { error: "Invalid preferredRegion" },
        { status: 400 }
      );
    }
    result.preferredRegion = await setUserPreferredRegion(
      session.user.id,
      next
    );
  }

  return NextResponse.json(result);
}
