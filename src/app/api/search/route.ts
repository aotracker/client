import { NextResponse } from "next/server";
import { searchLocal } from "@/lib/db/queries";
import {
  ensureLiveSearchQueued,
  getLiveSearchJobInfo,
} from "@/lib/ingest-api";
import {
  getDefaultRegion,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";
import {
  isLiveSearchInProgress,
  resolveLiveSearchRegions,
  type LiveSearchJobInfo,
} from "@/lib/search/live-search";

const EMPTY_LOCAL: Awaited<ReturnType<typeof searchLocal>> = {
  players: [],
  guilds: [],
  alliances: [],
};

function formatRouteError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message) return error.message;
    if (error.name === "AggregateError") {
      const nested = (error as AggregateError).errors?.[0];
      if (nested instanceof Error && nested.message) return nested.message;
    }
  }
  return "Search failed";
}

function emptyLiveSearch(regions: AlbionRegion[]): LiveSearchJobInfo {
  return {
    state: null,
    playersFound: null,
    guildsFound: null,
    regionsSearched: regions,
    lastError: null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const requested = searchParams.get("region");
  const region: AlbionRegion = isRegionEnabled(requested ?? "")
    ? (requested as AlbionRegion)
    : getDefaultRegion();
  const limitRaw = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 20)
    : 20;
  const liveRegions = resolveLiveSearchRegions(null);

  if (!q) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  if (requested && requested !== "all" && !isRegionEnabled(requested)) {
    return NextResponse.json({ error: "Region disabled" }, { status: 404 });
  }

  let liveSearch = emptyLiveSearch(liveRegions);

  try {
    await ensureLiveSearchQueued(q, liveRegions, { immediate: true });
    liveSearch = await getLiveSearchJobInfo(q, liveRegions);
  } catch {
    liveSearch = emptyLiveSearch(liveRegions);
  }

  try {
    const local = await searchLocal(q, limit);
    return NextResponse.json({
      local,
      region,
      liveSearch: {
        ...liveSearch,
        searching: isLiveSearchInProgress(liveSearch.state),
      },
    });
  } catch (error) {
    const localError = formatRouteError(error);
    return NextResponse.json(
      {
        error: localError,
        local: EMPTY_LOCAL,
        region,
        liveSearch: {
          ...liveSearch,
          searching: isLiveSearchInProgress(liveSearch.state),
        },
      },
      { status: 503 }
    );
  }
}
