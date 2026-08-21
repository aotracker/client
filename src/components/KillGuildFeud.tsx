import { Link } from "@/i18n/navigation";
import { KillCard } from "@/components/KillCard";
import { PageSection } from "@/components/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import { KillCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { getCachedGuildFeudKillsFromDb } from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { feudPath } from "@/lib/seo";

interface KillGuildFeudProps {
  region: AlbionRegion;
  guildA: string;
  guildB: string;
  guildAId?: string | null;
  guildBId?: string | null;
  excludeEventId: number;
}

export function KillGuildFeudFallback({
  guildA,
  guildB,
}: {
  guildA: string;
  guildB: string;
}) {
  return (
    <section className="space-y-3" aria-busy="true" aria-label="Loading guild feud">
      <div className="space-y-1">
        <Skeleton className="h-6 w-32" />
        <p className="text-sm text-muted-foreground">
          {guildA} vs {guildB}
        </p>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <KillCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export async function KillGuildFeud({
  region,
  guildA,
  guildB,
  guildAId,
  guildBId,
  excludeEventId,
}: KillGuildFeudProps) {
  const feudKills = await getCachedGuildFeudKillsFromDb(region, guildA, guildB, {
    limit: 10,
    excludeEventId,
    guildAId,
    guildBId,
  });

  const feudHref = feudPath(region, guildA, guildB);

  return (
    <PageSection
      title="Guild Feud"
      description={`${guildA} vs ${guildB}`}
      actions={
        <Link
          href={feudHref}
          className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
        >
          Full feud
        </Link>
      }
    >
      <div className="space-y-2">
        {feudKills.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              No other recent kills between these guilds in our database
            </CardContent>
          </Card>
        ) : (
          feudKills.map((feudEvent) => (
            <KillCard
              key={`feud-${feudEvent.eventId}`}
              event={feudEvent}
              compact
              compactSize="large"
            />
          ))
        )}
      </div>
    </PageSection>
  );
}
