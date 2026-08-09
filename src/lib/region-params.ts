import {
  ENABLED_REGIONS,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";
import { regionLabel } from "@/lib/utils";
import { setPreferredRegion } from "@/lib/region-preference";

export type FeedRegion = AlbionRegion | "all";

export const FEED_PATHS = ["/", "/battles", "/leaderboards", "/builds"] as const;

export type FeedPath = (typeof FEED_PATHS)[number];

/** Region filter chips shared by feed pages. */
export function feedRegionFilterOptions(): {
  value: FeedRegion;
  label: string;
}[] {
  return [
    { value: "all", label: "All Regions" },
    ...ENABLED_REGIONS.map((r) => ({ value: r, label: regionLabel(r) })),
  ];
}

/** Parse `?region=` for feed pages (missing or invalid → all regions). */
export function parseFeedRegion(value: string | undefined): FeedRegion {
  if (!value || value === "all") return "all";
  return isRegionEnabled(value) ? value : "all";
}

/** Read active feed region from URL search params. */
export function readFeedRegionParam(
  searchParams: URLSearchParams
): FeedRegion {
  return parseFeedRegion(searchParams.get("region") ?? undefined);
}

/** Write region into query params (`all` is kept explicit when chosen). */
export function applyFeedRegionParam(
  params: URLSearchParams,
  region: string
): void {
  if (region === "all") {
    params.set("region", "all");
    return;
  }
  if (isRegionEnabled(region)) {
    params.set("region", region);
    return;
  }
  params.delete("region");
}

/** Persist preference when the user picks a specific region chip. */
export function rememberFeedRegionSelection(region: string): void {
  if (isRegionEnabled(region)) {
    setPreferredRegion(region);
  }
}

/** Build a feed page href, merging current params with updates. */
export function buildFeedHref(
  pathname: string,
  currentParams: URLSearchParams,
  updates: Record<string, string | null | undefined>
): string {
  const params = new URLSearchParams(currentParams.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;

    if (key === "region") {
      if (value === null || value === "") {
        params.delete("region");
      } else {
        applyFeedRegionParam(params, value);
      }
      continue;
    }

    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Append region and optional params to a feed path for cross-page links. */
export function appendFeedRegionToHref(
  path: string,
  region: FeedRegion,
  extraParams?: Record<string, string>
): string {
  const params = new URLSearchParams(extraParams);
  if (region !== "all") {
    params.set("region", region);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** Nav link: include stored region when the user has set a preference. */
export function feedNavHref(
  path: string,
  storedRegion: AlbionRegion | null,
  extraParams?: Record<string, string>
): string {
  if (!storedRegion) {
    const params = new URLSearchParams(extraParams);
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  }
  return appendFeedRegionToHref(path, storedRegion, extraParams);
}

const FEED_SUBPATHS = ["battles", "leaderboards", "builds"] as const;

export type FeedSubpath = (typeof FEED_SUBPATHS)[number];

/**
 * Resolve pretty regional URLs to canonical feed paths.
 * `/americas` → `/?region=americas`, `/europe/battles` → `/battles?region=europe`
 */
export function resolveRegionAliasRedirect(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)(?:\/([^/]+))?\/?$/);
  if (!match) return null;

  const [, first, second] = match;
  if (!isRegionEnabled(first)) return null;

  if (!second) {
    return `/?region=${first}`;
  }

  if ((FEED_SUBPATHS as readonly string[]).includes(second)) {
    return `/${second}?region=${first}`;
  }

  return null;
}
