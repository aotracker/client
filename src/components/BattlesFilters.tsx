"use client";

import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import type { AlbionRegion } from "@/lib/albion/types";
import {
  BATTLES_FEED_MIN_PLAYERS_PARAM,
  parseBattlesMinPlayers,
  RECENT_BATTLES_MIN_PLAYERS,
} from "@/lib/battles-constants";
import {
  buildFeedHref,
  readFeedRegionParam,
  rememberFeedRegionSelection,
} from "@/lib/region-params";
import { Button } from "@/components/ui/button";
import { FilterBar, FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";

interface BattlesFiltersProps {
  regions: { value: AlbionRegion | "all"; label: string }[];
  activeRegion?: AlbionRegion | "all";
}

export function BattlesFilters({ regions, activeRegion = "all" }: BattlesFiltersProps) {
  const t = useTranslations("Battle");
  const tFilters = useTranslations("Filters");
  const router = useRouter();
  const searchParams = useSearchParams();
  const region = readFeedRegionParam(searchParams, activeRegion);
  const qParam = searchParams.get("q") ?? "";
  const minPlayers = parseBattlesMinPlayers(
    searchParams.get(BATTLES_FEED_MIN_PLAYERS_PARAM)
  );
  const [query, setQuery] = useState(qParam);
  const [minPlayersInput, setMinPlayersInput] = useState(String(minPlayers));

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    setMinPlayersInput(String(minPlayers));
  }, [minPlayers]);

  function pushParams(updates: {
    region?: string;
    q?: string | null;
    minPlayers?: string | null;
  }) {
    if (updates.region) {
      rememberFeedRegionSelection(updates.region);
    }
    router.push(buildFeedHref("/battles", searchParams, updates));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    pushParams({ q: query });
  }

  function commitMinPlayers() {
    const next = parseBattlesMinPlayers(minPlayersInput);
    setMinPlayersInput(String(next));
    if (next === minPlayers) return;
    pushParams({
      minPlayers:
        next === RECENT_BATTLES_MIN_PLAYERS ? null : String(next),
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <FilterBar>
        <FilterSelect
          label={tFilters("region")}
          value={region}
          options={regions.map((r) => ({
            value: r.value,
            label: r.label,
          }))}
          onChange={(next) => pushParams({ region: next })}
        />
        <label className="flex min-w-[8rem] flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("filters.minPlayers")}
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={RECENT_BATTLES_MIN_PLAYERS}
            step={1}
            value={minPlayersInput}
            onChange={(e) => setMinPlayersInput(e.target.value)}
            onBlur={commitMinPlayers}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitMinPlayers();
              }
            }}
            className="h-8 w-[4.5rem] px-2 text-center"
            aria-label={t("filters.minPlayersAria", {
              min: RECENT_BATTLES_MIN_PLAYERS,
            })}
          />
        </label>
      </FilterBar>

      <form onSubmit={handleSearch} className="flex w-full max-w-md items-center gap-2">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
            aria-label={t("searchPlaceholder")}
          />
        </div>
        <Button type="submit" size="sm">
          <Search className="h-3.5 w-3.5" aria-hidden />
          Search
        </Button>
        {qParam && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery("");
              pushParams({ q: null });
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear
          </Button>
        )}
      </form>
    </div>
  );
}
