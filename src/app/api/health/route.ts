import { NextResponse } from "next/server";
import { HEALTH_CACHE_REVALIDATE_SECONDS } from "@/lib/cache";
import { getGlobalSyncStatus } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const globalStatus = await getGlobalSyncStatus();

    return NextResponse.json(
      {
        isHealthy: globalStatus.isHealthy,
        bannerIssue: globalStatus.bannerIssue,
        message: globalStatus.message,
        lastIngestAt: globalStatus.lastSyncAt,
        isIngestStale: globalStatus.isStale ?? false,
        ingestLagMinutes: globalStatus.lagMinutes ?? null,
        anyCircuitOpen: globalStatus.anyCircuitOpen,
        regions: globalStatus.regions.map((row) => ({
          region: row.region,
          issues: row.issues,
          circuitOpen: row.circuitOpen,
          lastIngestAt: row.lastIngestAt,
          lastHealthCheckAt: row.lastHealthCheckAt,
          lastHealthCheckOk: row.lastHealthCheckOk,
          ingestLagMinutes: row.ingestLagMinutes,
          latestKillAt: row.latestKillAt,
          latestKillLagMinutes: row.latestKillLagMinutes,
        })),
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${HEALTH_CACHE_REVALIDATE_SECONDS}, stale-while-revalidate=${HEALTH_CACHE_REVALIDATE_SECONDS * 2}`,
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Health unavailable" },
      { status: 500 }
    );
  }
}
