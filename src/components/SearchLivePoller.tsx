"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { regionLabel } from "@/lib/utils";
import type { AlbionRegion } from "@/lib/albion/types";

interface SearchLivePollerProps {
  query: string;
  regions: AlbionRegion[];
  searching: boolean;
  playersFound?: number | null;
  guildsFound?: number | null;
}

export function SearchLivePoller({
  query,
  regions,
  searching,
  playersFound,
  guildsFound,
}: SearchLivePollerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!searching) return;

    const interval = window.setInterval(() => {
      router.refresh();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [router, searching]);

  if (!searching) {
    if (playersFound != null || guildsFound != null) {
      const parts: string[] = [];
      if (playersFound != null && playersFound > 0) {
        parts.push(`${playersFound} player${playersFound === 1 ? "" : "s"}`);
      }
      if (guildsFound != null && guildsFound > 0) {
        parts.push(`${guildsFound} guild${guildsFound === 1 ? "" : "s"}`);
      }
      if (parts.length === 0) return null;

      return (
        <p className="text-sm text-muted-foreground">
          Found {parts.join(" and ")} from Albion Online (
          {regions.map(regionLabel).join(", ")}).
        </p>
      );
    }
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-info-border/30 bg-info/5 px-3 py-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-info" />
      <span>
        Searching Albion Online in {regions.map(regionLabel).join(", ")} for “
        {query}”…
      </span>
    </div>
  );
}
