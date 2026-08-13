"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { Flame, Loader2, Shield, Skull, Swords } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DAYS = [7, 14, 30] as const;

const TAB_ICONS: Record<LeaderboardTab, LucideIcon> = {
  killers: Swords,
  fame: Flame,
  guilds: Shield,
  kills: Skull,
};

interface LeaderboardFiltersProps {
  regions: { value: AlbionRegion | "all"; label: string }[];
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function LeaderboardFilters({ regions }: LeaderboardFiltersProps) {
  const t = useTranslations("Leaderboards");
  const tFilters = useTranslations("Filters");
  const tCommon = useTranslations("Common");
  const searchParams = useSearchParams();
  const { isPending, pendingTab, push } = useLeaderboardNavigation();

  const tab = (searchParams.get("tab") as LeaderboardTab) || "killers";
  const region = readFeedRegionParam(searchParams);
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
    <Card className="overflow-hidden">
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

      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <FilterRow label={tFilters("region")}>
          {regions.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={region === r.value ? "default" : "outline"}
              aria-pressed={region === r.value}
              onClick={() => {
                const nextHours = primeTimeHoursForFilter(r.value);
                const keepHour =
                  hour != null && nextHours.includes(hour)
                    ? String(hour)
                    : "";
                push({ region: r.value, hour: keepHour });
              }}
            >
              {regionLabel(r.value)}
            </Button>
          ))}
        </FilterRow>

        <FilterRow label={tFilters("period")}>
          {DAYS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              aria-pressed={days === d}
              onClick={() => push({ days: String(d) })}
            >
              {tFilters("lastDays", { days: d })}
            </Button>
          ))}
        </FilterRow>

        <FilterRow label={tFilters("contentType")}>
          {contentTypes.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={type === item.value ? "default" : "outline"}
              aria-pressed={type === item.value}
              onClick={() => push({ type: item.value })}
            >
              {item.label}
            </Button>
          ))}
        </FilterRow>

        {showPrimeTime ? (
          <FilterRow label={tFilters("primeTime")}>
            <Button
              size="sm"
              variant={selectedPtHour == null ? "default" : "outline"}
              aria-pressed={selectedPtHour == null}
              onClick={() => push({ hour: "" })}
            >
              {tFilters("contentAll")}
            </Button>
            {ptHours.map((slot) => (
              <Button
                key={slot}
                size="sm"
                variant={selectedPtHour === slot ? "default" : "outline"}
                aria-pressed={selectedPtHour === slot}
                onClick={() => push({ hour: String(slot) })}
              >
                {formatUtcHour(slot)}
              </Button>
            ))}
          </FilterRow>
        ) : null}
      </div>
    </Card>
  );
}
