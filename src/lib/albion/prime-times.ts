import type { AlbionRegion } from "@/lib/albion/types";

export const REGION_PRIME_TIMES = {
  americas: { durationMinutes: 60, slotStartHoursUtc: [18, 20, 22, 0, 2, 4] },
  europe: { durationMinutes: 60, slotStartHoursUtc: [12, 14, 16, 18, 20, 22] },
  asia: { durationMinutes: 60, slotStartHoursUtc: [6, 8, 12, 14, 16, 18] },
} as const;

export type RegionPrimeTimes = (typeof REGION_PRIME_TIMES)[AlbionRegion];

export function primeTimeHours(region: AlbionRegion): readonly number[] {
  return REGION_PRIME_TIMES[region].slotStartHoursUtc;
}

export function primeTimeHoursForFilter(
  region: AlbionRegion | "all"
): readonly number[] {
  if (region !== "all") return primeTimeHours(region);

  const hours = new Set<number>();
  for (const slots of Object.values(REGION_PRIME_TIMES)) {
    for (const hour of slots.slotStartHoursUtc) hours.add(hour);
  }
  return [...hours].sort((a, b) => a - b);
}

export function isPrimeTimeHourForFilter(
  region: AlbionRegion | "all",
  utcHour: number
): boolean {
  return primeTimeHoursForFilter(region).includes(utcHour);
}

export function isPrimeTimeHour(
  region: AlbionRegion,
  utcHour: number
): boolean {
  return (REGION_PRIME_TIMES[region].slotStartHoursUtc as readonly number[]).includes(
    utcHour
  );
}

export function formatUtcHour(hour: number): string {
  const wrapped = ((hour % 24) + 24) % 24;
  return `${String(wrapped).padStart(2, "0")}:00`;
}
