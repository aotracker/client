"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AlbionRegion } from "@/lib/albion/types";
import type { WatchlistEntityType } from "@/lib/watchlist";
import { cn } from "@/lib/utils";
import { useWatchlist } from "./useWatchlist";

interface WatchlistButtonProps {
  type: WatchlistEntityType;
  region: AlbionRegion | string;
  albionId: string;
  name: string;
  className?: string;
}

export function WatchlistButton({
  type,
  region,
  albionId,
  name,
  className,
}: WatchlistButtonProps) {
  const { ready, isWatching, toggle } = useWatchlist();
  const watching = ready && isWatching(type, region as AlbionRegion, albionId);

  return (
    <Button
      type="button"
      size="sm"
      variant={watching ? "default" : "outline"}
      className={cn("gap-1.5", className)}
      disabled={!ready}
      aria-pressed={watching}
      onClick={() =>
        toggle(type, region as AlbionRegion, albionId, name)
      }
    >
      <Star
        className={cn("h-4 w-4", watching ? "fill-current" : "")}
        aria-hidden
      />
      {watching ? "Watching" : "Watch"}
    </Button>
  );
}
