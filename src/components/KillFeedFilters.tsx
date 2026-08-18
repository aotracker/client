"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import type { AlbionRegion } from "@/lib/albion/types";
import type { ContentTypeFilter } from "@/lib/db/queries";
import {
  MIN_FAME_OPTIONS,
  parseMinFame,
  parseWatchlistFlag,
} from "@/lib/kills-feed-params";
import {
  buildFeedHref,
  readFeedRegionParam,
  rememberFeedRegionSelection,
} from "@/lib/region-params";
import { formatFame } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSelect } from "@/components/ui/filter-select";

const CONTENT_FILTERS: ContentTypeFilter[] = ["all", "SOLO", "GROUP", "ZVZ"];

interface KillFeedFiltersProps {
  regions: { value: AlbionRegion | "all"; label: string }[];
  activeRegion?: AlbionRegion | "all";
  show?: "all" | "regions" | "contentTypes";
  pathname?: string;
  showMinFame?: boolean;
  showWatchlist?: boolean;
}

function isContentTypeFilter(value: string): value is ContentTypeFilter {
  return CONTENT_FILTERS.includes(value as ContentTypeFilter);
}

export function KillFeedFilters({
  regions,
  activeRegion = "all",
  show = "all",
  pathname = "/",
  showMinFame = false,
  showWatchlist = false,
}: KillFeedFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tRegions = useTranslations("Common.regions");
  const tContent = useTranslations("Common.contentTypes");
  const tFilters = useTranslations("Filters");
  const region = readFeedRegionParam(searchParams, activeRegion);
  const typeParam = searchParams.get("type") ?? "all";
  const contentType = isContentTypeFilter(typeParam) ? typeParam : "all";
  const minFame = parseMinFame(searchParams.get("minFame") ?? undefined);
  const watchlistOnly = parseWatchlistFlag(
    searchParams.get("watchlist") ?? undefined
  );

  function update(updates: {
    region?: string;
    type?: string;
    minFame?: string | null;
    watchlist?: string | null;
  }) {
    if (updates.region) {
      rememberFeedRegionSelection(updates.region);
    }
    router.push(
      buildFeedHref(pathname, searchParams, {
        ...updates,
        type: updates.type === "all" ? null : updates.type,
        offset: null,
      })
    );
  }

  const showRegions = show === "all" || show === "regions";
  const showContentTypes = show === "all" || show === "contentTypes";

  return (
    <FilterBar>
      {showRegions && (
        <FilterSelect
          label={tFilters("region")}
          value={region}
          options={regions.map((r) => ({
            value: r.value,
            label: tRegions.has(r.value) ? tRegions(r.value) : r.label,
          }))}
          onChange={(next) => update({ region: next })}
        />
      )}
      {showContentTypes && (
        <FilterSelect
          label={tFilters("contentType")}
          value={contentType}
          options={CONTENT_FILTERS.map((filter) => ({
            value: filter,
            label: tContent(filter),
          }))}
          onChange={(next) => update({ type: next })}
        />
      )}
      {showMinFame && (
        <FilterSelect
          label={tFilters("minFame")}
          value={String(minFame)}
          options={MIN_FAME_OPTIONS.map((value) => ({
            value: String(value),
            label:
              value === 0 ? tFilters("anyFame") : `${formatFame(value)}+`,
          }))}
          onChange={(next) =>
            update({ minFame: Number(next) > 0 ? next : null })
          }
        />
      )}
      {showWatchlist && (
        <Button
          variant={watchlistOnly ? "default" : "outline"}
          size="sm"
          aria-pressed={watchlistOnly}
          onClick={() => update({ watchlist: watchlistOnly ? null : "1" })}
        >
          {tFilters("watchlistOnly")}
        </Button>
      )}
    </FilterBar>
  );
}
