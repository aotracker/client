import type { Metadata } from "next";
import { Suspense } from "react";
import { getApiSyncState, getGlobalSyncStatus } from "@/lib/db/queries";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { pingEnabledRegions } from "@/lib/albion/live-pings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageSection";
import { formatRelativeTime, regionLabel } from "@/lib/utils";
import { buildPageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import type { RegionSyncStatus } from "@/lib/health/sync-status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "System Status",
  description: "Public AOTracker ingest and API health.",
  canonicalPath: "/health",
  robots: NOINDEX_FOLLOW,
});

type SyncStateRow = Awaited<ReturnType<typeof getApiSyncState>>[number];

type RegionStatusByKey = Partial<Record<string, RegionSyncStatus>>;

export default async function HealthPage() {
  let syncStates: SyncStateRow[] = [];
  let globalStatus: Awaited<ReturnType<typeof getGlobalSyncStatus>> | null =
    null;
  let dbError: string | null = null;

  try {
    [syncStates, globalStatus] = await Promise.all([
      getApiSyncState(),
      getGlobalSyncStatus(),
    ]);
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Database unavailable";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Status"
        description="Public health of Albion API connectivity and kill ingest"
      />

      {dbError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Status temporarily unavailable.
        </div>
      )}

      {globalStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Overall Status
              <Badge variant={globalStatus.isHealthy ? "solo" : "zvz"}>
                {globalStatus.isHealthy ? "Healthy" : "Degraded"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {globalStatus.message && !globalStatus.isHealthy && (
              <p className="text-amber-400">{globalStatus.message}</p>
            )}
            <p>
              Last ingest:{" "}
              {globalStatus.lastSyncAt
                ? formatRelativeTime(globalStatus.lastSyncAt)
                : "Never"}
            </p>
            {globalStatus.isStale && (
              <p className="text-amber-400">
                Ingest is delayed ({globalStatus.lagMinutes}m since last poll)
              </p>
            )}
            {globalStatus.anyCircuitOpen && (
              <p className="text-amber-400">
                One or more regions are cooling down — new data may be delayed
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Suspense fallback={<HealthRegionGridFallback syncStates={syncStates} />}>
        <HealthRegionGridLive
          syncStates={syncStates}
          regionStatuses={Object.fromEntries(
            (globalStatus?.regions ?? []).map((row) => [row.region, row])
          )}
        />
      </Suspense>
    </div>
  );
}

async function HealthRegionGridLive({
  syncStates,
  regionStatuses,
}: {
  syncStates: SyncStateRow[];
  regionStatuses: RegionStatusByKey;
}) {
  const livePings = await pingEnabledRegions();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {ENABLED_REGIONS.map((region) => {
        const dbState = syncStates.find((s) => s.region === region);
        const live = livePings[region];
        const circuitOpen = dbState?.circuitOpen === 1;
        const isOnline = live.ok && !circuitOpen;

        return (
          <HealthRegionCard
            key={region}
            regionLabel={regionLabel(region)}
            statusDot={
              isOnline ? "online" : circuitOpen ? "circuit" : "offline"
            }
            liveLabel={
              live.ok
                ? `Online (${live.latencyMs}ms)`
                : `Offline (${live.latencyMs}ms)`
            }
            circuitOpen={circuitOpen}
            lastIngest={dbState?.lastIngestAt ?? dbState?.lastSuccessAt ?? null}
            lastHealthCheck={dbState?.lastHealthCheckAt ?? null}
            healthCheckOk={(dbState?.lastHealthCheckOk ?? 0) === 1}
            regionStatus={regionStatuses[region]}
          />
        );
      })}
    </div>
  );
}

function HealthRegionGridFallback({
  syncStates,
}: {
  syncStates: SyncStateRow[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {ENABLED_REGIONS.map((region) => {
        const dbState = syncStates.find((s) => s.region === region);
        const circuitOpen = dbState?.circuitOpen === 1;

        return (
          <HealthRegionCard
            key={region}
            regionLabel={regionLabel(region)}
            statusDot={circuitOpen ? "circuit" : "pending"}
            liveLabel="Checking…"
            circuitOpen={circuitOpen}
            lastIngest={dbState?.lastIngestAt ?? dbState?.lastSuccessAt ?? null}
          />
        );
      })}
    </div>
  );
}

function HealthRegionCard({
  regionLabel: label,
  statusDot,
  liveLabel,
  circuitOpen,
  lastIngest,
  lastHealthCheck,
  healthCheckOk,
  regionStatus,
}: {
  regionLabel: string;
  statusDot: "online" | "offline" | "circuit" | "pending";
  liveLabel: string;
  circuitOpen: boolean;
  lastIngest: Date | null;
  lastHealthCheck?: Date | null;
  healthCheckOk?: boolean;
  regionStatus?: RegionSyncStatus;
}) {
  const dotClass =
    statusDot === "online"
      ? "bg-green-500"
      : statusDot === "circuit"
        ? "bg-red-500"
        : statusDot === "pending"
          ? "bg-muted-foreground/40 animate-pulse"
          : "bg-yellow-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          {label}
          <span className={`h-3 w-3 rounded-full ${dotClass}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Live API</span>
          <span>{liveLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Circuit</span>
          <span>{circuitOpen ? "Open" : "Closed"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Last ingest</span>
          <span>{lastIngest ? formatRelativeTime(lastIngest) : "—"}</span>
        </div>
        {lastHealthCheck != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Health check</span>
            <span>
              {healthCheckOk ? "OK" : "Failed"} ·{" "}
              {formatRelativeTime(lastHealthCheck)}
            </span>
          </div>
        )}
        {regionStatus?.latestKillAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Latest kill</span>
            <span>{formatRelativeTime(regionStatus.latestKillAt)}</span>
          </div>
        )}
        {regionStatus?.issues && regionStatus.issues.length > 0 && (
          <p className="text-xs text-amber-400">
            Issues: {regionStatus.issues.join(", ").replaceAll("_", " ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
