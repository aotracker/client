import { ENABLED_REGIONS, type AlbionRegion } from "@/lib/albion/types";
import { getRegionHealthMetrics } from "@/lib/db/api-state";
import { getApiSyncState, getRegionEntityCounts } from "@/lib/db/queries";
import { regionLabel } from "@/lib/utils";
import { getActiveErrorMessage } from "@/lib/ops/status-utils";
import { AdminRegionCard } from "./AdminRegionCard";

type SyncStateRow = Awaited<ReturnType<typeof getApiSyncState>>[number];
type EntityCountRow = Awaited<ReturnType<typeof getRegionEntityCounts>>[number];

export async function AdminRegionCards({
  syncStates,
  entityCounts,
}: {
  syncStates: SyncStateRow[];
  entityCounts: EntityCountRow[];
}) {
  const countsByRegion = new Map(
    entityCounts.map((row) => [row.region, row])
  );

  const healthMetrics = Object.fromEntries(
    await Promise.all(
      ENABLED_REGIONS.map(async (region) => [
        region,
        await getRegionHealthMetrics(region).catch(() => null),
      ] as const)
    )
  ) as Record<
    AlbionRegion,
    Awaited<ReturnType<typeof getRegionHealthMetrics>> | null
  >;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {ENABLED_REGIONS.map((region) => {
        const dbState = syncStates.find((s) => s.region === region);
        const metrics = healthMetrics[region];
        const circuitOpen =
          metrics?.circuitOpen || dbState?.circuitOpen === 1;
        const healthCheckOk = (dbState?.lastHealthCheckOk ?? 0) === 1;
        const activeError = getActiveErrorMessage(dbState);
        const isOnline = healthCheckOk && !circuitOpen;
        const counts = countsByRegion.get(region);
        const liveLabel = dbState?.lastHealthCheckAt
          ? healthCheckOk
            ? `Online (${dbState.avgLatencyMs ?? metrics?.avgLatencyMs ?? 0}ms)`
            : `Offline (${dbState.avgLatencyMs ?? metrics?.avgLatencyMs ?? 0}ms)`
          : "Awaiting health check";

        return (
          <AdminRegionCard
            key={region}
            regionLabel={regionLabel(region)}
            statusDot={
              isOnline ? "online" : circuitOpen ? "circuit" : "offline"
            }
            liveLabel={liveLabel}
            liveNote={
              circuitOpen ? "Circuit open — cooling down" : undefined
            }
            circuitOpen={!!circuitOpen}
            lastIngest={
              dbState?.lastIngestAt ?? dbState?.lastSuccessAt ?? null
            }
            lastHealthCheck={dbState?.lastHealthCheckAt ?? null}
            healthCheckOk={healthCheckOk}
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
