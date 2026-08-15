import "server-only";

import { cookies } from "next/headers";
import { isRegionEnabled } from "@/lib/albion/types";
import {
  PREFERRED_REGION_COOKIE,
  type PreferredRegion,
} from "@/lib/region-preference";
import { parseFeedRegion, type FeedRegion } from "@/lib/region-params";

function parseRegionValue(value: string | undefined): PreferredRegion | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "all") return "all";
  return isRegionEnabled(normalized) ? normalized : null;
}

/** Server component / route handler: read preferred region from request cookies. */
export async function getServerPreferredRegion(): Promise<PreferredRegion | null> {
  const cookieStore = await cookies();
  return parseRegionValue(cookieStore.get(PREFERRED_REGION_COOKIE)?.value);
}

/** Server: preferred region, or "all" when the cookie is missing/invalid. */
export async function getServerPreferredRegionOrDefault(): Promise<PreferredRegion> {
  return (await getServerPreferredRegion()) ?? "all";
}

/**
 * Feed/search pages: explicit `?region=` wins; otherwise use the cookie.
 * Missing cookie → all regions (not Americas).
 */
export async function resolveServerFeedRegion(
  urlRegion: string | undefined
): Promise<FeedRegion> {
  if (urlRegion != null && urlRegion !== "") {
    return parseFeedRegion(urlRegion);
  }
  return (await getServerPreferredRegion()) ?? "all";
}
