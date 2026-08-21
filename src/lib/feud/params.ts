export const FEUD_DAYS_OPTIONS = [7, 14, 30] as const;

export type FeudDaysFilter = (typeof FEUD_DAYS_OPTIONS)[number];

export const FEUD_KILLS_PAGE_SIZE = 25;

export function parseFeudDays(value: string | undefined): FeudDaysFilter {
  const parsed = Number(value);
  if (parsed === 14 || parsed === 30) return parsed;
  return 7;
}

export function parseFeudOffset(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

export function feudDaysCutoff(days: FeudDaysFilter): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
