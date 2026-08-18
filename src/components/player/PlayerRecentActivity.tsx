"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { List, Skull, Swords } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { KillCard } from "@/components/KillCard";
import { Card, CardContent } from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filter-select";
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
        <FilterSelect
          className="w-[11.5rem] sm:ml-auto"
          align="end"
          aria-label={tA11y("filterRecentActivity")}
          value={filter}
          options={[
            {
              value: "all",
              label: t("filterAll"),
              icon: List,
              suffix: activity.length,
            },
            {
              value: "kills",
              label: t("filterKills"),
              icon: Swords,
              suffix: kills.length,
            },
            {
              value: "deaths",
              label: t("filterDeaths"),
              icon: Skull,
              suffix: deaths.length,
            },
          ]}
          onChange={setFilter}
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <EmptyState
                icon={
                  filter === "kills"
                    ? Swords
                    : filter === "deaths"
                      ? Skull
                      : List
                }
                bordered={false}
                className="p-0"
              >
                {emptyMessage}
              </EmptyState>
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
