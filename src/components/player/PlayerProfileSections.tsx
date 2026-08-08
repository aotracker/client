import { getPlayerHistoryFromDb, getPlayerAnalytics } from "@/lib/db/queries";
import { isSyncStale } from "@/lib/db/sync";
import { getPlayerSyncJobState } from "@/lib/jobs/queue";
import { isPlayerDataIngesting } from "@/lib/ingest-status";
import type { AlbionRegion } from "@/lib/albion/types";
import { PlayerAnalyticsLazy } from "@/components/player-analytics/PlayerAnalyticsLazy";
import { IngestingBanner } from "@/components/IngestingBanner";
import { KillCard } from "@/components/KillCard";
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
    !historyLastSyncedAt || isSyncStale(historyLastSyncedAt);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Kills ({kills.length})</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Cached kill history from local database
        </p>
        <div className="space-y-3">
          {kills.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                {shouldSyncHistory
                  ? "Loading kill history from Albion Online…"
                  : "No recent kills"}
              </CardContent>
            </Card>
          ) : (
            kills.map((event) => (
              <KillCard
                key={`kill-${event.eventId}`}
                event={event}
                compact
                compactSize="large"
                fameVariant="kill"
              />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Deaths ({deaths.length})</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Cached death history from local database
        </p>
        <div className="space-y-3">
          {deaths.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                {shouldSyncHistory
                  ? "Loading death history from Albion Online…"
                  : "No recent deaths"}
              </CardContent>
            </Card>
          ) : (
            deaths.map((event) => (
              <KillCard
                key={`death-${event.eventId}`}
                event={event}
                compact
                compactSize="large"
                fameVariant="death"
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export function PlayerHistoryFallback() {
  return (
    <div className="grid gap-6 lg:grid-cols-2" aria-busy="true" aria-label="Loading history">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <KillCardSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <KillCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
