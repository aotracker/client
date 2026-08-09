import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getApiSyncState,
  getGlobalSyncStatus,
  getRegionEntityCounts,
} from "@/lib/db/queries";
import { getAlbionClient } from "@/lib/albion/client";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { pingEnabledRegions } from "@/lib/albion/live-pings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkerQueuesPanel } from "@/components/WorkerQueuesPanel";
import { PageHeader } from "@/components/PageSection";
import { formatRelativeTime, regionLabel } from "@/lib/utils";
import { getEnrichedQueueStatuses } from "@/lib/jobs/queue";
import { getCronJobStatuses } from "@/lib/jobs/cron-state";
import { buildPageMetadata, NOINDEX_NOFOLLOW } from "@/lib/seo";
import {
  isOpsAuthDisabled,
  verifyOpsAccess,
} from "@/lib/jobs/cron-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Ops Status",
  description: "AOTracker ingest health, API status, and worker queues.",
  canonicalPath: "/status",
  robots: NOINDEX_NOFOLLOW,
});

type SyncStateRow = Awaited<ReturnType<typeof getApiSyncState>>[number];
type EntityCountRow = Awaited<ReturnType<typeof getRegionEntityCounts>>[number];

export default async function StatusPage() {
  const authorized = await verifyOpsAccess();
  if (!authorized && !isOpsAuthDisabled()) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ops Status"
          description="Operator dashboard — authentication required"
        />
        <Card>
          <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
            <p>This page requires the ops secret.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Open{" "}
                <code className="text-foreground">
                  /api/ops-login?key=YOUR_CRON_SECRET
                </code>{" "}
                once to set a cookie, or
              </li>
              <li>
                Call{" "}
                <code className="text-foreground">GET /api/status</code> with{" "}
                <code className="text-foreground">Authorization: Bearer …</code>
              </li>
            </ul>
            <p>
              Public health is available at{" "}
              <a href="/health" className="text-primary hover:underline">
                /health
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  let syncStates: SyncStateRow[] = [];
  let globalStatus: Awaited<ReturnType<typeof getGlobalSyncStatus>> | null =
    null;
  let entityCounts: EntityCountRow[] = [];
  let dbError: string | null = null;
  const [queueStatus, cronStatus] = await Promise.all([
    getEnrichedQueueStatuses(),
    getCronJobStatuses(),
  ]);

  try {
    [syncStates, globalStatus, entityCounts] = await Promise.all([
      getApiSyncState(),
      getGlobalSyncStatus(),
      getRegionEntityCounts(),
    ]);
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Database unavailable";
  }

  const countsByRegion = new Map(
    entityCounts.map((row) => [row.region, row])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Status"
        description="Albion gameinfo API connectivity, cached entity totals, and BullMQ workers"
      />

      {dbError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Database error: {dbError}
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
                One or more regions are cooling down — workers defer and retry
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Suspense
        fallback={
          <StatusRegionGridFallback
            syncStates={syncStates}
            countsByRegion={countsByRegion}
          />
        }
      >
        <StatusRegionGridLive
          syncStates={syncStates}
          countsByRegion={countsByRegion}
        />
      </Suspense>

      <WorkerQueuesPanel initial={queueStatus} initialCrons={cronStatus} />
    </div>
  );
}

async function StatusRegionGridLive({
  syncStates,
  countsByRegion,
}: {
  syncStates: SyncStateRow[];
  countsByRegion: Map<string, EntityCountRow>;
}) {
  const client = getAlbionClient();
  const [healthMetrics, livePings] = await Promise.all([
    client.getHealthMetrics().catch(() => null),
    pingEnabledRegions(),
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {ENABLED_REGIONS.map((region) => {
        const dbState = syncStates.find((s) => s.region === region);
        const metrics = healthMetrics?.[region];
        const live = livePings[region];
        const circuitOpen =
          metrics?.circuitOpen || dbState?.circuitOpen === 1;
        const activeError = getActiveErrorMessage(dbState);
        const isOnline = live.ok && !circuitOpen;
        const counts = countsByRegion.get(region);

        return (
          <StatusRegionCard
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
            liveNote={live.note}
            circuitOpen={!!circuitOpen}
            lastIngest={dbState?.lastIngestAt ?? dbState?.lastSuccessAt ?? null}
            lastHealthCheck={dbState?.lastHealthCheckAt ?? null}
            healthCheckOk={(dbState?.lastHealthCheckOk ?? 0) === 1}
            failures={String(
              dbState?.consecutiveFailures ??
                metrics?.consecutiveFailures ??
                0
            )}
            avgLatency={`${metrics?.avgLatencyMs ?? dbState?.avgLatencyMs ?? 0}ms`}
            players={(counts?.players ?? 0).toLocaleString()}
            guilds={(counts?.guilds ?? 0).toLocaleString()}
            kills={(counts?.kills ?? 0).toLocaleString()}
            battles={(counts?.battles ?? 0).toLocaleString()}
            activeError={activeError}
            previousError={
              dbState?.lastErrorMessage && !activeError
                ? dbState.lastErrorMessage
                : null
            }
          />
        );
      })}
    </div>
  );
}

function StatusRegionGridFallback({
  syncStates,
  countsByRegion,
}: {
  syncStates: SyncStateRow[];
  countsByRegion: Map<string, EntityCountRow>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {ENABLED_REGIONS.map((region) => {
        const dbState = syncStates.find((s) => s.region === region);
        const circuitOpen = dbState?.circuitOpen === 1;
        const activeError = getActiveErrorMessage(dbState);
        const counts = countsByRegion.get(region);

        return (
          <StatusRegionCard
            key={region}
            regionLabel={regionLabel(region)}
            statusDot={circuitOpen ? "circuit" : "pending"}
            liveLabel="Checking…"
            circuitOpen={!!circuitOpen}
            lastIngest={dbState?.lastIngestAt ?? dbState?.lastSuccessAt ?? null}
            lastHealthCheck={dbState?.lastHealthCheckAt ?? null}
            healthCheckOk={(dbState?.lastHealthCheckOk ?? 0) === 1}
            failures={String(dbState?.consecutiveFailures ?? 0)}
            avgLatency={`${dbState?.avgLatencyMs ?? 0}ms`}
            players={(counts?.players ?? 0).toLocaleString()}
            guilds={(counts?.guilds ?? 0).toLocaleString()}
            kills={(counts?.kills ?? 0).toLocaleString()}
            battles={(counts?.battles ?? 0).toLocaleString()}
            activeError={activeError}
            previousError={
              dbState?.lastErrorMessage && !activeError
                ? dbState.lastErrorMessage
                : null
            }
          />
        );
      })}
    </div>
  );
}

function StatusRegionCard({
  regionLabel: label,
  statusDot,
  liveLabel,
  liveNote,
  circuitOpen,
  lastIngest,
  lastHealthCheck,
  healthCheckOk,
  failures,
  avgLatency,
  players,
  guilds,
  kills,
  battles,
  activeError,
  previousError,
}: {
  regionLabel: string;
  statusDot: "online" | "offline" | "circuit" | "pending";
  liveLabel: string;
  liveNote?: string;
  circuitOpen: boolean;
  lastIngest: Date | null;
  lastHealthCheck?: Date | null;
  healthCheckOk?: boolean;
  failures: string;
  avgLatency: string;
  players: string;
  guilds: string;
  kills: string;
  battles: string;
  activeError: string | null;
  previousError: string | null;
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
        <Row label="Live API" value={liveLabel} />
        {liveNote && <p className="text-xs text-amber-300">{liveNote}</p>}
        <Row label="Circuit" value={circuitOpen ? "OPEN" : "Closed"} />
        <Row
          label="Last ingest"
          value={lastIngest ? formatRelativeTime(lastIngest) : "—"}
        />
        {lastHealthCheck != null && (
          <Row
            label="Health check"
            value={`${healthCheckOk ? "OK" : "Failed"} · ${formatRelativeTime(lastHealthCheck)}`}
          />
        )}
        <Row label="Failures" value={failures} />
        <Row label="Avg latency" value={avgLatency} />
        <div className="my-2 border-t border-border/50" />
        <Row label="Players tracked" value={players} />
        <Row label="Guilds tracked" value={guilds} />
        <Row label="Kills tracked" value={kills} />
        <Row label="Battles tracked" value={battles} />
        {activeError && (
          <p className="mt-2 rounded bg-muted/50 p-2 text-xs text-red-300">
            {activeError}
          </p>
        )}
        {previousError && (
          <p className="mt-2 rounded bg-muted/30 p-2 text-xs text-muted-foreground">
            Previous issue (resolved): {previousError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function getActiveErrorMessage(
  dbState?: {
    lastSuccessAt: Date | null;
    lastErrorAt: Date | null;
    lastErrorMessage: string | null;
  } | null
): string | null {
  if (!dbState?.lastErrorMessage) return null;
  if (
    dbState.lastErrorMessage.includes("failed to ingest") ||
    dbState.lastErrorMessage.includes("returned no data")
  ) {
    return dbState.lastErrorMessage;
  }
  if (!dbState.lastErrorAt) return dbState.lastErrorMessage;
  if (!dbState.lastSuccessAt) return dbState.lastErrorMessage;
  if (dbState.lastSuccessAt > dbState.lastErrorAt) return null;
  return dbState.lastErrorMessage;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
