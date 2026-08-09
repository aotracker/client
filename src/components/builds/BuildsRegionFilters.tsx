"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { AlbionRegion } from "@/lib/albion/types";
import {
  buildFeedHref,
  readFeedRegionParam,
  rememberFeedRegionSelection,
} from "@/lib/region-params";
import { Button } from "@/components/ui/button";

interface BuildsRegionFiltersProps {
  regions: { value: AlbionRegion | "all"; label: string }[];
}

export function BuildsRegionFilters({ regions }: BuildsRegionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const region = readFeedRegionParam(searchParams);

  function updateRegion(next: string) {
    rememberFeedRegionSelection(next);
    router.push(buildFeedHref("/builds", searchParams, { region: next }));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {regions.map((r) => (
        <Button
          key={r.value}
          variant={region === r.value ? "default" : "outline"}
          size="sm"
          aria-pressed={region === r.value}
          onClick={() => updateRegion(r.value)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}
