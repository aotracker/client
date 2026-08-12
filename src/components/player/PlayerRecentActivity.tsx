"use client";

import { useMemo, useState } from "react";
import { KillCard } from "@/components/KillCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { KillCardEvent } from "@/lib/albion/player-history";

type ActivityFilter = "all" | "kills" | "deaths";

type ActivityEvent = KillCardEvent & {
  kind: "kill" | "death";
};

interface PlayerRecentActivityProps {
  kills: KillCardEvent[];
  deaths: KillCardEvent[];
  shouldSyncHistory: boolean;
}

function occurredAtMs(value: Date | string): number {
  const ms = (typeof value === "string" ? new Date(value) : value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function PlayerRecentActivity({
  kills,
  deaths,
  shouldSyncHistory,
}: PlayerRecentActivityProps) {
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const activity = useMemo<ActivityEvent[]>(() => {
    const merged: ActivityEvent[] = [
      ...kills.map((event) => ({ ...event, kind: "kill" as const })),
      ...deaths.map((event) => ({ ...event, kind: "death" as const })),
    ];
    merged.sort(
      (a, b) => occurredAtMs(b.occurredAt) - occurredAtMs(a.occurredAt)
    );
    return merged;
  }, [kills, deaths]);

  const filtered = useMemo(() => {
    if (filter === "kills") return activity.filter((e) => e.kind === "kill");
    if (filter === "deaths") return activity.filter((e) => e.kind === "death");
    return activity;
  }, [activity, filter]);

  const emptyMessage = (() => {
    if (activity.length === 0) {
      return shouldSyncHistory
        ? "Loading activity from Albion Online…"
        : "No recent activity";
    }
    if (filter === "kills") return "No recent kills";
    if (filter === "deaths") return "No recent deaths";
    return "No recent activity";
  })();

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <p className="text-xs text-muted-foreground">
            Cached kill and death history · {kills.length} kills ·{" "}
            {deaths.length} deaths
          </p>
        </div>
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Filter recent activity"
        >
          {(
            [
              { id: "all", label: "All", count: activity.length },
              { id: "kills", label: "Kills", count: kills.length },
              { id: "deaths", label: "Deaths", count: deaths.length },
            ] as const
          ).map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={filter === option.id ? "default" : "outline"}
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
              className={cn(
                filter === option.id &&
                  option.id === "kills" &&
                  "border-stat-kill/40 bg-stat-kill/20 text-stat-kill hover:bg-stat-kill/30",
                filter === option.id &&
                  option.id === "deaths" &&
                  "border-stat-death/40 bg-stat-death/20 text-stat-death hover:bg-stat-death/30"
              )}
            >
              {option.label}
              <span className="ml-1 tabular-nums opacity-80">
                {option.count}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              {emptyMessage}
            </CardContent>
          </Card>
        ) : (
          filtered.map((event) => (
            <KillCard
              key={`${event.kind}-${event.eventId}`}
              event={event}
              compact
              compactSize="large"
              fameVariant={event.kind}
            />
          ))
        )}
      </div>
    </section>
  );
}
