"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Player.activity");
  const tA11y = useTranslations("Common.a11y");
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
      return shouldSyncHistory ? t("loading") : t("empty");
    }
    if (filter === "kills") return t("emptyKills");
    if (filter === "deaths") return t("emptyDeaths");
    return t("empty");
  })();

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("subtitle", { kills: kills.length, deaths: deaths.length })}
          </p>
        </div>
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label={tA11y("filterRecentActivity")}
        >
          {(
            [
              { id: "all" as const, label: t("filterAll"), count: activity.length },
              { id: "kills" as const, label: t("filterKills"), count: kills.length },
              {
                id: "deaths" as const,
                label: t("filterDeaths"),
                count: deaths.length,
              },
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
