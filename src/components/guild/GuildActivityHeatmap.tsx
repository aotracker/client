"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn, formatFame } from "@/lib/utils";
import type { AlbionRegion } from "@/lib/albion/types";
import type { GuildHourBucket } from "@/lib/db/queries";
import {
  formatUtcHour,
  isPrimeTimeHour,
  primeTimeHours,
} from "@/lib/albion/prime-times";

interface GuildActivityHeatmapProps {
  region: AlbionRegion;
  hours: GuildHourBucket[];
  peakPrimeHour?: number | null;
}

export function GuildActivityHeatmap({
  region,
  hours,
  peakPrimeHour = null,
}: GuildActivityHeatmapProps) {
  const t = useTranslations("Guild.activity");
  const [hover, setHover] = useState<GuildHourBucket | null>(null);

  const { bars, maxMembers } = useMemo(() => {
    const byHour = new Map(hours.map((hour) => [hour.utcHour, hour]));
    const activeHours = hours
      .filter(
        (hour) => hour.uniqueMembers > 0 || hour.kills > 0 || hour.deaths > 0
      )
      .map((hour) => hour.utcHour);
    const visibleHours = [
      ...new Set([...primeTimeHours(region), ...activeHours]),
    ].sort((a, b) => a - b);

    const bars = visibleHours.map((utcHour) => {
      return (
        byHour.get(utcHour) ?? {
          utcHour,
          uniqueMembers: 0,
          kills: 0,
          deaths: 0,
          fame: 0,
        }
      );
    });
    const maxMembers = Math.max(0, ...bars.map((bar) => bar.uniqueMembers));
    return { bars, maxMembers };
  }, [hours, region]);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        {bars.map((bar) => {
          const prime = isPrimeTimeHour(region, bar.utcHour);
          const isPeak = peakPrimeHour === bar.utcHour;
          const heightPct =
            maxMembers > 0
              ? Math.max(
                  bar.uniqueMembers > 0 ? 8 : 0,
                  (bar.uniqueMembers / maxMembers) * 100
                )
              : 0;

          return (
            <button
              key={bar.utcHour}
              type="button"
              aria-label={t("hover", {
                hour: formatUtcHour(bar.utcHour),
                members: bar.uniqueMembers,
                kills: bar.kills,
                deaths: bar.deaths,
                fame: formatFame(bar.fame),
              })}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md px-0.5 py-1 transition-colors hover:bg-accent/60",
                isPeak && "bg-primary/10"
              )}
              onMouseEnter={() => setHover(bar)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex h-24 w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-10 rounded-t-sm border",
                    isPeak
                      ? "border-primary bg-primary"
                      : prime
                        ? "border-primary/50 bg-stat-kill/70"
                        : "border-border/40 bg-muted-foreground/40"
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span
                className={cn(
                  "inline-flex flex-col items-center rounded-md px-1.5 py-1 leading-none",
                  isPeak
                    ? "bg-primary/15 text-primary"
                    : prime
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground"
                )}
              >
                <span className="text-xs font-semibold tabular-nums sm:text-sm">
                  {formatUtcHour(bar.utcHour)}
                </span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider opacity-70">
                  {t("hourAxis")}
                </span>
              </span>
              {isPeak ? (
                <span className="text-[9px] font-semibold uppercase leading-none text-primary">
                  {t("peakLabel")}
                </span>
              ) : (
                <span className="h-2.5" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
        <div className="min-h-[1rem] truncate">
          {hover ? (
            <span>
              {t("hover", {
                hour: formatUtcHour(hover.utcHour),
                members: hover.uniqueMembers,
                kills: hover.kills,
                deaths: hover.deaths,
                fame: formatFame(hover.fame),
              })}
            </span>
          ) : (
            <span>{t("hoverHint")}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {peakPrimeHour != null ? (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-sm bg-primary" />
              {t("legendPeak")}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-sm border border-primary/50 bg-stat-kill/70" />
            {t("legendPrime")}
          </span>
        </div>
      </div>
    </div>
  );
}
