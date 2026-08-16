import { getPlayerHistoryFromDb, getPlayerAnalytics } from "@/lib/db/queries";
import { isSyncStale, HISTORY_SYNC_STALE_MS } from "@/lib/db/sync";
import { getPlayerSyncJobState } from "@/lib/jobs/queue";
import { isPlayerDataIngesting } from "@/lib/ingest-status";
import type { AlbionRegion } from "@/lib/albion/types";
import { PlayerAnalyticsLazy } from "@/components/player-analytics/PlayerAnalyticsLazy";
import { IngestingBanner } from "@/components/IngestingBanner";
import { PlayerRecentActivity } from "@/components/player/PlayerRecentActivity";
import { Card, CardContent } from "@/components/ui/card";
import { KillCardSkeleton, Skeleton } from "@/components/ui/skeleton";

interface PlayerSectionProps {
  region: AlbionRegion;
  playerId: string;
}

export async function PlayerIngestingBanner({
  region,
  playerId,
  lastSyncedAt,
  historyLastSyncedAt,
}: PlayerSectionProps & {
  lastSyncedAt: Date | null;
  historyLastSyncedAt: Date | null;
}) {
  const syncJobState = await getPlayerSyncJobState(region, playerId);
  const isIngesting = isPlayerDataIngesting({
    lastSyncedAt,
    historyLastSyncedAt,
    syncJobState,
  });

  if (!isIngesting) return null;
  return <IngestingBanner entityType="player" />;
}

export async function PlayerAnalyticsSection({
  region,
  playerId,
}: PlayerSectionProps) {
  const analytics = await getPlayerAnalytics(region, playerId);
  return <PlayerAnalyticsLazy data={analytics} />;
}

export function PlayerAnalyticsFallback() {
  return (
    <section className="space-y-3" aria-busy="true" aria-label="Loading analytics">
      <div className="space-y-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 py-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="space-y-3 py-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export async function PlayerHistorySection({
  region,
  playerId,
  historyLastSyncedAt,
}: PlayerSectionProps & { historyLastSyncedAt: Date | null }) {
  const { kills, deaths } = await getPlayerHistoryFromDb(region, playerId);
  const shouldSyncHistory =
    !historyLastSyncedAt || isSyncStale(historyLastSyncedAt, HISTORY_SYNC_STALE_MS);

  return (
    <PlayerRecentActivity
      kills={kills}
      deaths={deaths}
      shouldSyncHistory={shouldSyncHistory}
    />
  );
}

export function PlayerHistoryFallback() {
  return (
    <section className="space-y-3" aria-busy="true" aria-label="Loading activity">
      <div className="space-y-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <KillCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
