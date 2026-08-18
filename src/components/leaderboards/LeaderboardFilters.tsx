"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { Flame, Loader2, Shield, Skull, Swords, Users } from "lucide-react";
import type { AlbionRegion } from "@/lib/albion/types";
import type { ContentTypeFilter } from "@/lib/db/queries";
import {
  LEADERBOARD_TABS,
  parseLeaderboardHour,
  type LeaderboardTab,
} from "@/lib/leaderboards/params";
import { readFeedRegionParam } from "@/lib/region-params";
import {
  formatUtcHour,
  primeTimeHoursForFilter,
} from "@/lib/albion/prime-times";
import { useLeaderboardNavigation } from "@/components/leaderboards/LeaderboardNavigation";
import { FilterBar, FilterSelect } from "@/components/ui/filter-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DAYS = [7, 14, 30] as const;

const TAB_ICONS: Record<LeaderboardTab, LucideIcon> = {
  killers: Swords,
  fame: Flame,
  guilds: Shield,
  alliances: Users,
  kills: Skull,
};

interface LeaderboardFiltersProps {
  regions: { value: AlbionRegion | "all"; label: string }[];
  activeRegion?: AlbionRegion | "all";
}

export function LeaderboardFilters({
  regions,
  activeRegion = "all",
}: LeaderboardFiltersProps) {
  const t = useTranslations("Leaderboards");
  const tFilters = useTranslations("Filters");
  const tCommon = useTranslations("Common");
  const searchParams = useSearchParams();
  const { isPending, pendingTab, push } = useLeaderboardNavigation();

  const tab = (searchParams.get("tab") as LeaderboardTab) || "killers";
  const region = readFeedRegionParam(searchParams, activeRegion);
  const days = Number(searchParams.get("days") ?? "7");
  const type = (searchParams.get("type") as ContentTypeFilter) || "all";
  const hour = parseLeaderboardHour(searchParams.get("hour") ?? undefined);
  const showPrimeTime = tab === "guilds";
  const ptHours = primeTimeHoursForFilter(region);
  const selectedPtHour =
    hour != null && ptHours.includes(hour) ? hour : null;

  const contentTypes: { value: ContentTypeFilter; label: string }[] = [
    { value: "all", label: tFilters("contentAll") },
    { value: "SOLO", label: tFilters("contentSolo") },
    { value: "GROUP", label: tFilters("contentGroup") },
    { value: "ZVZ", label: tFilters("contentZvz") },
  ];

  const regionLabel = (value: AlbionRegion | "all") => {
    if (value === "all") return tCommon("regions.all");
    if (value === "americas") return tCommon("regions.americas");
    if (value === "europe") return tCommon("regions.europe");
    if (value === "asia") return tCommon("regions.asia");
    return value;
  };

  return (
    <Card>
      <nav
        className="flex flex-wrap gap-1 border-b border-border bg-muted/20 px-3 pt-2 sm:px-4"
        aria-label={tCommon("a11y.leaderboardType")}
      >
        {LEADERBOARD_TABS.map((id) => {
          const active = tab === id;
          const Icon = TAB_ICONS[id];
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              disabled={isPending}
              onClick={() => push({ tab: id })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-t-md px-3 py-2.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                "disabled:pointer-events-none disabled:opacity-60",
                active
                  ? "border-b-2 border-primary bg-background text-foreground"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t(`tabs.${id}.label`)}
              {isPending && pendingTab === id && (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </nav>

      <FilterBar className="p-4">
        <FilterSelect
          label={tFilters("region")}
          value={region}
          disabled={isPending}
          options={regions.map((r) => ({
            value: r.value,
            label: regionLabel(r.value),
          }))}
          onChange={(next) => {
            const nextHours = primeTimeHoursForFilter(next);
            const keepHour =
              hour != null && nextHours.includes(hour) ? String(hour) : "";
            push({ region: next, hour: keepHour });
          }}
        />

        <FilterSelect
          label={tFilters("period")}
          value={String(days as (typeof DAYS)[number])}
          disabled={isPending}
          options={DAYS.map((d) => ({
            value: String(d),
            label: tFilters("lastDays", { days: d }),
          }))}
          onChange={(next) => push({ days: next })}
        />

        <FilterSelect
          label={tFilters("contentType")}
          value={type}
          disabled={isPending}
          options={contentTypes}
          onChange={(next) => push({ type: next })}
        />

        {showPrimeTime ? (
          <FilterSelect
            label={tFilters("primeTime")}
            value={selectedPtHour == null ? "" : String(selectedPtHour)}
            disabled={isPending}
            options={[
              { value: "", label: tFilters("contentAll") },
              ...ptHours.map((slot) => ({
                value: String(slot),
                label: formatUtcHour(slot),
              })),
            ]}
            onChange={(next) => push({ hour: next })}
          />
        ) : null}
      </FilterBar>
    </Card>
  );
}
