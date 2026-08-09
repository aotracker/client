"use client";

import { useEffect } from "react";
import { syncPreferredRegionStores } from "@/lib/region-preference";

/** Keeps localStorage and cookie in sync after upgrades or partial clears. */
export function RegionPreferenceSync() {
  useEffect(() => {
    syncPreferredRegionStores();
  }, []);

  return null;
}
