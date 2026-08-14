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
  const [selected, setSelected] = useState<GuildHourBucket | null>(null);
  const shown = hover ?? selected;

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
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:hidden">
        {t("hourAxis")}
      </p>
      <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="flex w-max min-w-full items-end gap-1 px-1 sm:w-full sm:gap-2">
          {bars.map((bar) => {
            const prime = isPrimeTimeHour(region, bar.utcHour);
            const isPeak = peakPrimeHour === bar.utcHour;
            const isShown = shown?.utcHour === bar.utcHour;
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
                aria-pressed={isShown}
                aria-label={t("hover", {
                  hour: formatUtcHour(bar.utcHour),
                  members: bar.uniqueMembers,
                  kills: bar.kills,
                  deaths: bar.deaths,
                  fame: formatFame(bar.fame),
                })}
                className={cn(
                  "flex w-12 shrink-0 touch-manipulation flex-col items-center gap-1 rounded-md px-0.5 py-1 transition-colors hover:bg-accent/60 sm:w-auto sm:min-w-0 sm:flex-1 sm:gap-1.5",
                  isPeak && "bg-primary/10",
                  isShown && "bg-accent/70"
                )}
                onClick={() => setSelected(bar)}
                onMouseEnter={() => setHover(bar)}
                onMouseLeave={() => setHover(null)}
              >
                <div className="flex h-24 w-full items-end justify-center">
                  <div
                    className={cn(
                      "w-full max-w-8 rounded-t-sm border sm:max-w-10",
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
                    "inline-flex w-full flex-col items-center rounded-md px-0.5 py-1 leading-none sm:px-1.5",
                    isPeak
                      ? "bg-primary/15 text-primary"
                      : prime
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  <span className="text-[11px] font-semibold tabular-nums sm:text-sm">
                    {formatUtcHour(bar.utcHour)}
                  </span>
                  <span className="mt-0.5 hidden text-[9px] font-semibold uppercase tracking-wider opacity-70 sm:block">
                    {t("hourAxis")}
                  </span>
                </span>
                {isPeak ? (
                  <span className="hidden text-[9px] font-semibold uppercase leading-none text-primary sm:block">
                    {t("peakLabel")}
                  </span>
                ) : (
                  <span className="hidden h-2.5 sm:block" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 text-[11px] text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:text-[10px]">
        <p className="min-h-[2.75rem] leading-snug sm:min-h-[1rem] sm:truncate">
          {shown ? (
            t("hover", {
              hour: formatUtcHour(shown.utcHour),
              members: shown.uniqueMembers,
              kills: shown.kills,
              deaths: shown.deaths,
              fame: formatFame(shown.fame),
            })
          ) : (
            t("hoverHint")
          )}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 sm:shrink-0 sm:justify-end">
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
