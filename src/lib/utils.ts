import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  parseItemType,
  itemIconUrl,
  itemIconRemoteUrl,
  itemIconCacheKey,
} from "@/lib/item-icons";

export { parseItemType, itemIconUrl, itemIconRemoteUrl, itemIconCacheKey };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFame(value: number | null | undefined): string {
  if (value == null) return "0";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}b`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString();
}

/** Compact silver formatter (same scale labels as fame). */
export function formatSilver(value: number | null | undefined): string {
  return formatFame(value);
}

export function formatItemPower(
  value: number | string | null | undefined
): string | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return String(Math.round(parsed));
}

export function formatRelativeTime(date: Date | string): string {
  return formatRelativeTimeLong(date) ?? formatExactDateTime(date);
}

/** Relative label for timestamps within the last 24 hours; null when older. */
export const RELATIVE_TIME_WINDOW_MS = 24 * 60 * 60 * 1000;

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function isWithinRelativeTimeWindow(date: Date | string): boolean {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return false;
  const diff = Date.now() - d.getTime();
  return diff >= 0 && diff < RELATIVE_TIME_WINDOW_MS;
}

export function formatRelativeTimeLong(date: Date | string): string | null {
  if (!isWithinRelativeTimeWindow(date)) return null;
  const diff = Date.now() - toDate(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}

/** Albion server timestamp: "August 3, 2026 at 03:04:10 UTC". */
export function formatExactDateTime(date: Date | string): string {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return "Unknown date";

  const datePart = d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const timePart = d.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  return `${datePart} at ${timePart} UTC`;
}

/** @deprecated Use formatExactDateTime — same format. */
export function formatUtcDateTime24h(date: Date | string): string {
  return formatExactDateTime(date);
}

/** UTC clock fragment for job timestamps (stable across server/client). */
export function formatUtcTimeOfDay(value: Date | string | number): string {
  const d = typeof value === "number" ? new Date(value) : toDate(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function formatItemDisplayName(baseName: string): string {
  return baseName
    .replace(/^T\d+_/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatItemName(type: string): string {
  const { baseName, tier, enchantment } = parseItemType(type);
  const name = formatItemDisplayName(baseName);
  const enchantLabel = enchantment > 0 ? ` +${enchantment}` : "";
  return `T${tier} ${name}${enchantLabel}`;
}

export function regionLabel(region: string): string {
  const labels: Record<string, string> = {
    americas: "Americas",
    europe: "Europe",
    asia: "Asia",
  };
  return labels[region] ?? region;
}

/** Alliance display label: `[TAG] Name` when a tag is present. */
export function formatAllianceLabel(
  name: string,
  tag?: string | null
): string {
  const trimmedTag = tag?.trim();
  return trimmedTag ? `[${trimmedTag}] ${name}` : name;
}

/** Compact alliance link label: `[TAG]`, or name when no tag. */
export function formatAllianceTag(
  name: string,
  tag?: string | null
): string {
  const trimmedTag = tag?.trim();
  return trimmedTag ? `[${trimmedTag}]` : name;
}

/** Albion API returns fame/healing as floats or decimal strings; DB columns are bigint. */
export function toBigInt(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  return Math.round(n);
}
