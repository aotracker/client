"use client";

import {
  cn,
  formatExactDateTime,
  formatRelativeTimeLong,
  isWithinRelativeTimeWindow,
} from "@/lib/utils";

interface RelativeTimeProps {
  date: Date | string;
  className?: string;
}

/** Kill/event timestamps: relative within 24h (with exact UTC tooltip), otherwise standard UTC format. */
export function RelativeTime({ date, className }: RelativeTimeProps) {
  const exact = formatExactDateTime(date);
  const relative = formatRelativeTimeLong(date);
  const showRelative = isWithinRelativeTimeWindow(date) && relative;

  if (showRelative) {
    return (
      <time
        dateTime={toIsoString(date)}
        className={cn(className)}
        title={exact}
        suppressHydrationWarning
      >
        {relative}
      </time>
    );
  }

  return (
    <time
      dateTime={toIsoString(date)}
      className={cn(className)}
      suppressHydrationWarning
    >
      {exact}
    </time>
  );
}

function toIsoString(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
