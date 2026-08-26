"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import type { AlbionRegion } from "@/lib/albion/types";
import type { ContentTypeFilter } from "@/lib/db/queries";
import {
  MIN_FAME_OPTIONS,
  parseJuicyFlag,
  parseMinFame,
  parseWatchlistFlag,
} from "@/lib/kills-feed-params";
import {
  buildFeedHref,
  readFeedRegionParam,
  rememberFeedRegionSelection,
} from "@/lib/region-params";
import { formatFame } from "@/lib/utils";
import {
  FilterBar,
  FilterCheckbox,
  FilterSelect,
} from "@/components/ui/filter-select";

const CONTENT_FILTERS: ContentTypeFilter[] = ["all", "SOLO", "GROUP", "ZVZ"];

interface KillFeedFiltersProps {
  regions?: { value: AlbionRegion | "all"; label: string }[];
  activeRegion?: AlbionRegion | "all";
  show?: "all" | "regions" | "contentTypes" | "none";
  pathname?: string;
  showMinFame?: boolean;
  showWatchlist?: boolean;
  showJuicy?: boolean;
}

function isContentTypeFilter(value: string): value is ContentTypeFilter {
  return CONTENT_FILTERS.includes(value as ContentTypeFilter);
}

export function KillFeedFilters({
  regions = [],
  activeRegion = "all",
  show = "all",
  pathname = "/",
  showMinFame = false,
  showWatchlist = false,
  showJuicy = false,
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
  const juicy = parseJuicyFlag(searchParams.get("juicy") ?? undefined);

  function update(updates: {
    region?: string;
    type?: string;
    minFame?: string | null;
    watchlist?: string | null;
    juicy?: string | null;
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
        <FilterCheckbox
          label={tFilters("watchlistOnly")}
          checked={watchlistOnly}
          onChange={(next) => update({ watchlist: next ? "1" : null })}
        />
      )}
      {showJuicy && (
        <FilterCheckbox
          label={tFilters("juicy")}
          title={tFilters("juicyHint")}
          checked={juicy}
          onChange={(next) => update({ juicy: next ? "1" : null })}
        />
      )}
    </FilterBar>
  );
}
