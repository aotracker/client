import "server-only";

import { cookies } from "next/headers";
import {
  getDefaultRegion,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";
import { PREFERRED_REGION_COOKIE } from "@/lib/region-preference";

function parseRegionValue(value: string | undefined): AlbionRegion | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return isRegionEnabled(normalized) ? normalized : null;
}

/** Server component / route handler: read preferred region from request cookies. */
export async function getServerPreferredRegion(): Promise<AlbionRegion | null> {
  const cookieStore = await cookies();
  return parseRegionValue(cookieStore.get(PREFERRED_REGION_COOKIE)?.value);
}

/** Server: preferred region or site default when cookie is missing/invalid. */
export async function getServerPreferredRegionOrDefault(): Promise<AlbionRegion> {
  return (await getServerPreferredRegion()) ?? getDefaultRegion();
}
