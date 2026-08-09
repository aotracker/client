import {
  ENABLED_REGIONS,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";

export type LiveSearchJobInfo = {
  state: string | null;
  playersFound: number | null;
  guildsFound: number | null;
  regionsSearched: AlbionRegion[];
  lastError: string | null;
};

export function resolveLiveSearchRegions(
  region: AlbionRegion | string | null | undefined
): AlbionRegion[] {
  if (region && isRegionEnabled(region)) {
    return [region];
  }
  return [...ENABLED_REGIONS];
}

export function isLiveSearchInProgress(state: string | null | undefined): boolean {
  return state === "waiting" || state === "delayed" || state === "active";
}
