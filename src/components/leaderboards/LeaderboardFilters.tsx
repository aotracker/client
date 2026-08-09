"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { AlbionRegion } from "@/lib/albion/types";
import type { ContentTypeFilter } from "@/lib/db/queries";
import {
  LEADERBOARD_TAB_META,
  type LeaderboardTab,
} from "@/lib/leaderboards/params";
import { readFeedRegionParam } from "@/lib/region-params";
import { useLeaderboardNavigation } from "@/components/leaderboards/LeaderboardNavigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CONTENT_TYPES: { value: ContentTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "SOLO", label: "1v1" },
  { value: "GROUP", label: "Group" },
  { value: "ZVZ", label: "ZvZ" },
];

const DAYS = [7, 14, 30] as const;

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
  const searchParams = useSearchParams();
  const { isPending, pendingTab, push } = useLeaderboardNavigation();

  const tab = (searchParams.get("tab") as LeaderboardTab) || "killers";
  const region = readFeedRegionParam(searchParams);
  const days = Number(searchParams.get("days") ?? "7");
  const type = (searchParams.get("type") as ContentTypeFilter) || "all";

  return (
    <Card className="overflow-hidden">
      <nav
        className="flex flex-wrap gap-1 border-b border-border bg-muted/20 px-3 pt-2 sm:px-4"
        aria-label="Leaderboard type"
      >
        {(Object.keys(LEADERBOARD_TAB_META) as LeaderboardTab[]).map((id) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              disabled={isPending}
              onClick={() => push({ tab: id })}
              className={cn(
                "inline-flex items-center rounded-t-md px-3 py-2.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                "disabled:pointer-events-none disabled:opacity-60",
                active
                  ? "border-b-2 border-primary bg-background text-foreground"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              )}
            >
              {LEADERBOARD_TAB_META[id].label}
              {isPending && pendingTab === id && (
                <Loader2
                  className="ml-1.5 h-3.5 w-3.5 animate-spin"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <FilterRow label="Region">
          {regions.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={region === r.value ? "default" : "outline"}
              aria-pressed={region === r.value}
              onClick={() => push({ region: r.value })}
            >
              {r.label}
            </Button>
          ))}
        </FilterRow>

        <FilterRow label="Period">
          {DAYS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              aria-pressed={days === d}
              onClick={() => push({ days: String(d) })}
            >
              Last {d} days
            </Button>
          ))}
        </FilterRow>

        <FilterRow label="Content type">
          {CONTENT_TYPES.map((item) => (
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
      </div>
    </Card>
  );
}
