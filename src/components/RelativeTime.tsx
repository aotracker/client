"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  cn,
  formatExactDateTimeI18n,
  formatRelativeTimeI18n,
  formatRelativeTimeLongI18n,
  isWithinRelativeTimeWindow,
} from "@/lib/utils";

interface RelativeTimeProps {
  date: Date | string;
  className?: string;
}

/** Kill/event timestamps: relative within 24h (with exact UTC tooltip), otherwise standard UTC format. */
export function RelativeTime({ date, className }: RelativeTimeProps) {
  const t = useTranslations("Common.relativeTime");
  const locale = useLocale();
  const exact = formatExactDateTimeI18n(date, t, locale);
  const relative = formatRelativeTimeLongI18n(date, t);
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

/** Inline relative/exact timestamp for client components (avoids hydration mismatch). */
export function RelativeTimeLabel({
  date,
  className,
}: {
  date: Date | string;
  className?: string;
}) {
  const t = useTranslations("Common.relativeTime");
  const locale = useLocale();
  return (
    <span className={className} suppressHydrationWarning>
      {formatRelativeTimeI18n(date, t, locale)}
    </span>
  );
}
