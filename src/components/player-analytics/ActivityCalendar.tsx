"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PlayerActivityDay } from "@/lib/db/queries";

interface ActivityCalendarProps {
  activity: PlayerActivityDay[];
}

const DAY_WINDOW = 30;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function startOfWeekSunday(date: Date): Date {
  return addUtcDays(date, -date.getUTCDay());
}

function intensityClass(total: number, max: number): string {
  if (total <= 0) return "bg-muted/50 text-muted-foreground";
  if (max <= 0) return "bg-stat-kill/20 text-foreground";
  const ratio = total / max;
  if (ratio <= 0.25) return "bg-stat-kill/25 text-foreground";
  if (ratio <= 0.5) return "bg-stat-kill/45 text-foreground";
  if (ratio <= 0.75) return "bg-stat-kill/70 text-background";
  return "bg-stat-kill text-background";
}

type Cell = {
  day: string;
  dayOfMonth: number;
  events: number;
  kills: number;
  deaths: number;
  inWindow: boolean;
};

export function ActivityCalendar({ activity }: ActivityCalendarProps) {
  const [hover, setHover] = useState<{
    day: string;
    events: number;
    kills: number;
    deaths: number;
  } | null>(null);

  const { weeks, monthLabels, maxTotal } = useMemo(() => {
    const byDay = new Map(activity.map((d) => [d.day, d]));
    const today = startOfUtcDay(new Date());
    const rangeStart = addUtcDays(today, -(DAY_WINDOW - 1));

    const gridStart = startOfWeekSunday(rangeStart);
    const gridEnd = startOfWeekSunday(today);
    const weekCount =
      Math.round((gridEnd.getTime() - gridStart.getTime()) / (7 * 86400000)) +
      1;

    const weeks: Cell[][] = [];
    let maxTotal = 0;

    for (let w = 0; w < weekCount; w++) {
      const weekStart = addUtcDays(gridStart, w * 7);
      const cells: Cell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addUtcDays(weekStart, d);
        const day = toDayKey(date);
        const inWindow = date >= rangeStart && date <= today;
        const entry = byDay.get(day);
        const events = inWindow ? (entry?.events ?? 0) : 0;
        const kills = inWindow ? (entry?.kills ?? 0) : 0;
        const deaths = inWindow ? (entry?.deaths ?? 0) : 0;
        if (inWindow && events > maxTotal) maxTotal = events;
        cells.push({
          day,
          dayOfMonth: date.getUTCDate(),
          events,
          kills,
          deaths,
          inWindow,
        });
      }
      weeks.push(cells);
    }

    const monthLabels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks.length; w++) {
      const anchor = weeks[w].find((c) => c.inWindow);
      if (!anchor) continue;
      const month = new Date(`${anchor.day}T00:00:00.000Z`).getUTCMonth();
      if (month !== lastMonth) {
        monthLabels.push({
          weekIndex: w,
          label: new Date(`${anchor.day}T00:00:00.000Z`).toLocaleDateString(
            undefined,
            { month: "short", timeZone: "UTC" }
          ),
        });
        lastMonth = month;
      }
    }

    return { weeks, monthLabels, maxTotal };
  }, [activity]);

  return (
    <div className="flex h-56 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-[2rem_1fr] gap-2">
        <div className="grid grid-rows-7 gap-1 pt-5 text-[10px] leading-none text-muted-foreground">
          {DAY_LABELS.map((label) => (
            <div key={label} className="flex items-center justify-end pr-0.5">
              {label}
            </div>
          ))}
        </div>

        <div className="flex min-h-0 min-w-0 flex-col gap-1">
          <div
            className="grid h-4 text-[10px] text-muted-foreground"
            style={{
              gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
            }}
          >
            {weeks.map((_, wi) => {
              const label = monthLabels.find((m) => m.weekIndex === wi)?.label;
              return (
                <div key={wi} className="truncate px-0.5">
                  {label ?? ""}
                </div>
              );
            })}
          </div>

          <div
            className="grid min-h-0 flex-1 gap-1"
            style={{
              gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
              gridTemplateRows: "repeat(7, minmax(0, 1fr))",
              gridAutoFlow: "column",
            }}
          >
            {weeks.map((week) =>
              week.map((cell) => {
                if (!cell.inWindow) {
                  return (
                    <div
                      key={cell.day}
                      className="rounded-sm bg-transparent"
                      aria-hidden
                    />
                  );
                }

                return (
                  <button
                    key={cell.day}
                    type="button"
                    aria-label={`${formatDayLabel(cell.day)}: ${cell.events} PvP events, ${cell.kills} kills, ${cell.deaths} deaths`}
                    className={cn(
                      "flex items-center justify-center rounded-sm border border-border/40 text-[10px] font-medium tabular-nums transition-shadow hover:ring-1 hover:ring-foreground/50",
                      intensityClass(cell.events, maxTotal)
                    )}
                    onMouseEnter={() =>
                      setHover({
                        day: cell.day,
                        events: cell.events,
                        kills: cell.kills,
                        deaths: cell.deaths,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                  >
                    {cell.dayOfMonth}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
        <div className="min-h-[1rem] truncate">
          {hover ? (
            <span>
              {formatDayLabel(hover.day)} · {hover.events} event
              {hover.events === 1 ? "" : "s"} · {hover.kills} kill
              {hover.kills === 1 ? "" : "s"} · {hover.deaths} death
              {hover.deaths === 1 ? "" : "s"}
            </span>
          ) : (
            <span>Hover a day for details</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((level) => (
            <span
              key={level}
              className={cn(
                "inline-block size-2.5 rounded-sm border border-border/40",
                level === 0
                  ? "bg-muted/50"
                  : intensityClass(
                      Math.max(1, Math.round(level * maxTotal)),
                      maxTotal
                    )
              )}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
