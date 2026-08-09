"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { AlbionRegion } from "@/lib/albion/types";
import type { ContentTypeFilter } from "@/lib/db/queries";
import {
  buildFeedHref,
  readFeedRegionParam,
  rememberFeedRegionSelection,
} from "@/lib/region-params";
import { Button } from "@/components/ui/button";

const CONTENT_FILTERS: { value: ContentTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "SOLO", label: "1v1" },
  { value: "GROUP", label: "Group" },
  { value: "ZVZ", label: "ZvZ" },
];

interface KillFeedFiltersProps {
  regions: { value: AlbionRegion | "all"; label: string }[];
  show?: "all" | "regions" | "contentTypes";
}

function isContentTypeFilter(value: string): value is ContentTypeFilter {
  return CONTENT_FILTERS.some((filter) => filter.value === value);
}

export function KillFeedFilters({
  regions,
  show = "all",
}: KillFeedFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const region = readFeedRegionParam(searchParams);
  const typeParam = searchParams.get("type") ?? "all";
  const contentType = isContentTypeFilter(typeParam) ? typeParam : "all";

  function update(updates: { region?: string; type?: string }) {
    if (updates.region) {
      rememberFeedRegionSelection(updates.region);
    }
    router.push(
      buildFeedHref("/", searchParams, {
        ...updates,
        type: updates.type === "all" ? null : updates.type,
        offset: null,
      })
    );
  }

  const showRegions = show === "all" || show === "regions";
  const showContentTypes = show === "all" || show === "contentTypes";

  return (
    <div
      className={
        show === "all"
          ? "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          : "flex flex-wrap gap-2"
      }
    >
      {showRegions && (
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <Button
              key={r.value}
              variant={region === r.value ? "default" : "outline"}
              size="sm"
              aria-pressed={region === r.value}
              onClick={() => update({ region: r.value })}
            >
              {r.label}
            </Button>
          ))}
        </div>
      )}
      {showContentTypes && (
        <div className="flex flex-wrap gap-2">
          {CONTENT_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={contentType === filter.value ? "default" : "outline"}
              size="sm"
              aria-pressed={contentType === filter.value}
              onClick={() => update({ type: filter.value })}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
