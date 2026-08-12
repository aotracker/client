import { getGuildTopKillsFromDb } from "@/lib/db/queries";
import { isSyncStale } from "@/lib/db/sync";
import type { AlbionRegion } from "@/lib/albion/types";
import { KillCard } from "@/components/KillCard";
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
    !historyLastSyncedAt || isSyncStale(historyLastSyncedAt);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">
        {t("title", { count: topKills.length })}
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">{t("description")}</p>
      <div className="space-y-2">
        {topKills.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              {shouldSyncHistory ? t("loading") : t("empty")}
            </CardContent>
          </Card>
        ) : (
          topKills.map((event) => (
            <KillCard
              key={`top-${event.eventId}`}
              event={event}
              compact
              compactSize="large"
            />
          ))
        )}
      </div>
    </section>
  );
}

export function GuildTopKillsFallback() {
  return (
    <section aria-busy="true" aria-label="Loading top kills">
      <Skeleton className="mb-3 h-5 w-32" />
      <Skeleton className="mb-3 h-3 w-48" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <KillCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
