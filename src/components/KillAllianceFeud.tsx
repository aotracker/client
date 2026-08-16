import { Link } from "@/i18n/navigation";
import { KillCard } from "@/components/KillCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllianceFeudKillsFromDb } from "@/lib/db/queries";
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
    <Card>
      <CardHeader>
        <CardTitle>Alliance Feud</CardTitle>
        <p className="text-sm text-muted-foreground">
          {allianceAName} vs {allianceBName}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Loading recent feud kills…
        </p>
      </CardContent>
    </Card>
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
  const feudKills = await getAllianceFeudKillsFromDb(
    region,
    allianceAId,
    allianceBId,
    {
      limit: 10,
      excludeEventId,
    }
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Alliance Feud</CardTitle>
          <p className="text-sm text-muted-foreground">
            {allianceAName} vs {allianceBName}
          </p>
        </div>
        <Link
          href={allianceFeudPath(region, allianceAId, allianceBId)}
          className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
        >
          Full feud
        </Link>
      </CardHeader>
      <CardContent>
        {feudKills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No other recent kills between these alliances in our database
          </p>
        ) : (
          <div className="space-y-3">
            {feudKills.map((feudEvent) => (
              <KillCard
                key={`alliance-feud-${feudEvent.eventId}`}
                event={feudEvent}
                compact
                compactSize="large"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
