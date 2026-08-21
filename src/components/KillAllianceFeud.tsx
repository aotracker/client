import { Link } from "@/i18n/navigation";
import { KillCard } from "@/components/KillCard";
import { PageSection } from "@/components/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import { KillCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { getCachedAllianceFeudKillsFromDb } from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { allianceFeudPath } from "@/lib/seo";

interface KillAllianceFeudProps {
  region: AlbionRegion;
  allianceAId: string;
  allianceBId: string;
  allianceAName: string;
  allianceBName: string;
  excludeEventId: number;
}

export function KillAllianceFeudFallback({
  allianceAName,
  allianceBName,
}: {
  allianceAName: string;
  allianceBName: string;
}) {
  return (
    <section className="space-y-3" aria-busy="true" aria-label="Loading alliance feud">
      <div className="space-y-1">
        <Skeleton className="h-6 w-36" />
        <p className="text-sm text-muted-foreground">
          {allianceAName} vs {allianceBName}
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

export async function KillAllianceFeud({
  region,
  allianceAId,
  allianceBId,
  allianceAName,
  allianceBName,
  excludeEventId,
}: KillAllianceFeudProps) {
  const feudKills = await getCachedAllianceFeudKillsFromDb(
    region,
    allianceAId,
    allianceBId,
    {
      limit: 10,
      excludeEventId,
    }
  );

  return (
    <PageSection
      title="Alliance Feud"
      description={`${allianceAName} vs ${allianceBName}`}
      actions={
        <Link
          href={allianceFeudPath(region, allianceAId, allianceBId)}
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
              No other recent kills between these alliances in our database
            </CardContent>
          </Card>
        ) : (
          feudKills.map((feudEvent) => (
            <KillCard
              key={`alliance-feud-${feudEvent.eventId}`}
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
