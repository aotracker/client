import { cache } from "react";
import { max, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ENABLED_REGIONS, type AlbionRegion } from "@/lib/albion/types";
import { regionLabel } from "@/lib/utils";

/**
 * Public "Delayed" threshold: warn when the newest kill for a region is older
 * than this (~1–2 missed 25-minute ingest cycles + buffer).
 */
export const LATEST_KILL_STALE_MINUTES = 45;

/** @deprecated Prefer LATEST_KILL_STALE_MINUTES; same value for config registry. */
export const INGEST_STALE_MINUTES = LATEST_KILL_STALE_MINUTES;

/** Expected health cron interval is ~5m; allow two missed runs. */
export const HEALTH_CHECK_STALE_MINUTES = 12;

export type RegionHealthIssue =
  | "circuit_open"
  | "api_unreachable"
  | "ingest_stale";

export type BannerIssueKind = RegionHealthIssue;

/** Public-facing Albion API health label for a single region. */
export type RegionApiHealthLabel =
  | "healthy"
  | "delayed"
  | "unreachable"
  | "cooling_down";

export interface RegionSyncStatus {
  region: AlbionRegion;
  issues: RegionHealthIssue[];
  circuitOpen: boolean;
  lastIngestAt: Date | null;
  lastHealthCheckAt: Date | null;
  lastHealthCheckOk: boolean;
  ingestLagMinutes: number | null;
  latestKillAt: Date | null;
  latestKillLagMinutes: number | null;
}

export interface GlobalSyncStatus {
  isHealthy: boolean;
  bannerIssue: BannerIssueKind | null;
  message: string | null;
  regions: RegionSyncStatus[];
  /** @deprecated Use lastIngestAt on regions; kept for /api/health compat */
  lastSyncAt: Date | null;
  /** True when any region has a delayed kill feed (latest kill > threshold). */
  isStale: boolean;
  /** Max latest-kill lag across regions (minutes). */
  lagMinutes: number | null;
  anyCircuitOpen: boolean;
  anyRecentFailure: boolean;
  affectedRegions: Partial<Record<BannerIssueKind, AlbionRegion[]>>;
}

type ApiSyncRow = typeof schema.apiSyncState.$inferSelect;

function minutesSince(date: Date | null | undefined, nowMs: number): number | null {
  if (!date) return null;
  return Math.floor((nowMs - date.getTime()) / 60_000);
}

function formatRegionList(regions: AlbionRegion[]): string {
  return regions.map((region) => regionLabel(region)).join(", ");
}

/** Compact lag for the delayed-API banner: `45m`, `3h 12m`, or `1d 19h`. */
function formatLatestKillLag(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  if (total < 60) return `${total}m`;

  const dayMinutes = 24 * 60;
  if (total >= dayMinutes) {
    const days = Math.floor(total / dayMinutes);
    const hours = Math.floor((total % dayMinutes) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function getRegionApiHealthLabel(
  region: RegionSyncStatus
): RegionApiHealthLabel {
  if (region.issues.includes("circuit_open")) return "cooling_down";
  if (region.issues.includes("api_unreachable")) return "unreachable";
  if (region.issues.includes("ingest_stale")) return "delayed";
  return "healthy";
}

export function buildStatusBannerMessage(status: GlobalSyncStatus): string | null {
  if (status.isHealthy || !status.bannerIssue) return null;

  const regions = status.affectedRegions[status.bannerIssue] ?? [];

  switch (status.bannerIssue) {
    case "circuit_open":
      return regions.length > 0
        ? `Albion API cooling down for ${formatRegionList(regions)} — showing cached data; workers will retry shortly.`
        : "Albion API cooling down — showing cached data; workers will retry shortly.";
    case "api_unreachable":
      return regions.length > 0
        ? `Albion API unreachable for ${formatRegionList(regions)} — showing cached data.`
        : "Albion API unreachable — showing cached data.";
    case "ingest_stale": {
      const lag = status.regions
        .filter((row) => row.issues.includes("ingest_stale"))
        .map((row) => row.latestKillLagMinutes)
        .filter((value): value is number => value != null);
      const maxLag = lag.length > 0 ? Math.max(...lag) : null;
      const lagText =
        maxLag != null ? ` (latest kill ${formatLatestKillLag(maxLag)} ago)` : "";
      return regions.length > 0
        ? `Albion API delayed for ${formatRegionList(regions)}${lagText} — kill data may be outdated.`
        : `Albion API delayed${lagText} — kill data may be outdated.`;
    }
    default:
      return "Albion API sync is degraded — showing cached data.";
  }
}

function evaluateRegion(
  region: AlbionRegion,
  row: ApiSyncRow | undefined,
  latestKillAt: Date | null,
  nowMs: number
): RegionSyncStatus {
  const circuitOpen = (row?.circuitOpen ?? 0) === 1;
  const lastIngestAt = row?.lastIngestAt ?? null;
  const lastHealthCheckAt = row?.lastHealthCheckAt ?? null;
  const lastHealthCheckOk = (row?.lastHealthCheckOk ?? 0) === 1;
  const ingestLagMinutes = minutesSince(lastIngestAt, nowMs);
  const healthLagMinutes = minutesSince(lastHealthCheckAt, nowMs);
  const latestKillLagMinutes = minutesSince(latestKillAt, nowMs);

  const issues: RegionHealthIssue[] = [];

  if (circuitOpen) {
    issues.push("circuit_open");
  }

  const healthCheckRecent =
    healthLagMinutes !== null && healthLagMinutes <= HEALTH_CHECK_STALE_MINUTES;

  if (healthCheckRecent && !lastHealthCheckOk) {
    issues.push("api_unreachable");
  }

  // Public "Delayed": newest kill for this region is missing or older than threshold.
  if (
    latestKillLagMinutes === null ||
    latestKillLagMinutes > LATEST_KILL_STALE_MINUTES
  ) {
    issues.push("ingest_stale");
  }

  return {
    region,
    issues,
    circuitOpen,
    lastIngestAt,
    lastHealthCheckAt,
    lastHealthCheckOk,
    ingestLagMinutes,
    latestKillAt,
    latestKillLagMinutes,
  };
}

function pickBannerIssue(regions: RegionSyncStatus[]): BannerIssueKind | null {
  const priority: BannerIssueKind[] = [
    "circuit_open",
    "api_unreachable",
    "ingest_stale",
  ];

  for (const issue of priority) {
    if (regions.some((row) => row.issues.includes(issue))) {
      return issue;
    }
  }

  return null;
}

export async function getLatestKillAtByRegion(): Promise<
  Map<AlbionRegion, Date>
> {
  if (ENABLED_REGIONS.length === 0) return new Map();

  const rows = await db
    .select({
      region: schema.killEvents.region,
      latestKillAt: max(schema.killEvents.occurredAt),
    })
    .from(schema.killEvents)
    .where(inArray(schema.killEvents.region, ENABLED_REGIONS))
    .groupBy(schema.killEvents.region);

  return new Map(
    rows
      .filter((row): row is { region: AlbionRegion; latestKillAt: Date } =>
        Boolean(row.latestKillAt)
      )
      .map((row) => [row.region, row.latestKillAt])
  );
}

export const getGlobalSyncStatus = cache(async function getGlobalSyncStatus(): Promise<
  GlobalSyncStatus
> {
  const nowMs = Date.now();

  const [syncRows, latestKills] = await Promise.all([
    db.query.apiSyncState.findMany({
      where: inArray(schema.apiSyncState.region, ENABLED_REGIONS),
    }),
    getLatestKillAtByRegion(),
  ]);

  if (syncRows.length === 0 && ENABLED_REGIONS.length > 0) {
    return {
      isHealthy: false,
      bannerIssue: "ingest_stale",
      message: "Kill feed has not started yet — data may be incomplete.",
      regions: ENABLED_REGIONS.map((region) =>
        evaluateRegion(region, undefined, latestKills.get(region) ?? null, nowMs)
      ),
      lastSyncAt: null,
      isStale: true,
      lagMinutes: null,
      anyCircuitOpen: false,
      anyRecentFailure: false,
      affectedRegions: { ingest_stale: [...ENABLED_REGIONS] },
    };
  }

  const regions = ENABLED_REGIONS.map((region) => {
    const row = syncRows.find((state) => state.region === region);
    return evaluateRegion(region, row, latestKills.get(region) ?? null, nowMs);
  });

  const bannerIssue = pickBannerIssue(regions);
  const affectedRegions: Partial<Record<BannerIssueKind, AlbionRegion[]>> = {};

  for (const issue of ["circuit_open", "api_unreachable", "ingest_stale"] as const) {
    const matched = regions
      .filter((row) => row.issues.includes(issue))
      .map((row) => row.region);
    if (matched.length > 0) {
      affectedRegions[issue] = matched;
    }
  }

  const lastIngest = regions.reduce((latest, row) => {
    if (!row.lastIngestAt) return latest;
    if (!latest || row.lastIngestAt > latest) return row.lastIngestAt;
    return latest;
  }, null as Date | null);

  const killLags = regions
    .map((row) => row.latestKillLagMinutes)
    .filter((value): value is number => value != null);
  const maxKillLag = killLags.length > 0 ? Math.max(...killLags) : null;
  const isStale = regions.some((row) => row.issues.includes("ingest_stale"));

  const anyCircuitOpen = regions.some((row) => row.circuitOpen);
  const anyRecentFailure = syncRows.some((row) => {
    if (!row.lastErrorAt || !row.lastSuccessAt) return !!row.lastErrorAt;
    return row.lastErrorAt > row.lastSuccessAt;
  });

  const status: GlobalSyncStatus = {
    isHealthy: bannerIssue === null,
    bannerIssue,
    message: null,
    regions,
    lastSyncAt: lastIngest,
    isStale,
    lagMinutes: maxKillLag,
    anyCircuitOpen,
    anyRecentFailure,
    affectedRegions,
  };

  status.message = buildStatusBannerMessage(status);
  return status;
});
