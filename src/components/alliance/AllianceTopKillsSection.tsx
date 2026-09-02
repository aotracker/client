import {
  getAllianceFameFromMemberGuilds,
  getAllianceTopKillsFromDb,
} from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { KillCardServer } from "@/components/KillCardServer";
import { Card, CardContent } from "@/components/ui/card";
import { KillCardSkeleton, Skeleton } from "@/components/ui/skeleton";

export async function AllianceTopKillsSection({
  region,
  allianceId,
}: {
  region: AlbionRegion;
  allianceId: string;
}) {
  const topKills = await getAllianceTopKillsFromDb(region, allianceId, 10);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">
        Top Kills ({topKills.length})
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Highest fame kills by this alliance at the time of the kill
      </p>
      <div className="space-y-2">
        {topKills.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              No cached kills for alliance members yet
            </CardContent>
          </Card>
        ) : (
          topKills.map((event) => (
            <KillCardServer
              key={`${event.region}-${event.eventId}`}
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

export function AllianceTopKillsFallback() {
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
