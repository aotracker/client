import { getGuildTopKillsFromDb } from "@/lib/db/queries";
import { isSyncStale, HISTORY_SYNC_STALE_MS } from "@/lib/db/sync";
import type { AlbionRegion } from "@/lib/albion/types";
import { KillCardServer } from "@/components/KillCardServer";
import { PageSection } from "@/components/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import { KillCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";

export async function GuildTopKillsSection({
  region,
  guildId,
  historyLastSyncedAt,
}: {
  region: AlbionRegion;
  guildId: string;
  historyLastSyncedAt: Date | null;
}) {
  const t = await getTranslations("Guild.topKills");
  const topKills = await getGuildTopKillsFromDb(region, guildId);
  const shouldSyncHistory =
    !historyLastSyncedAt || isSyncStale(historyLastSyncedAt, HISTORY_SYNC_STALE_MS);

  return (
    <PageSection
      title={t("title", { count: topKills.length })}
      description={t("description")}
    >
      <div className="space-y-2">
        {topKills.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              {shouldSyncHistory ? t("loading") : t("empty")}
            </CardContent>
          </Card>
        ) : (
          topKills.map((event) => (
            <KillCardServer
              key={`top-${event.eventId}`}
              event={event}
              compact
              compactSize="large"
            />
          ))
        )}
      </div>
    </PageSection>
  );
}

export function GuildTopKillsFallback() {
  return (
    <section className="space-y-3" aria-busy="true" aria-label="Loading top kills">
      <div className="space-y-1">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <KillCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
