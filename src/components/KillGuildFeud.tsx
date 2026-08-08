import Link from "next/link";
import { KillCard } from "@/components/KillCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGuildFeudKillsFromDb } from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";

interface KillGuildFeudProps {
  region: AlbionRegion;
  guildA: string;
  guildB: string;
  guildAId?: string;
  guildBId?: string;
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
    <Card>
      <CardHeader>
        <CardTitle>Guild Feud</CardTitle>
        <p className="text-sm text-muted-foreground">
          {guildA} vs {guildB}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Loading recent feud kills…</p>
      </CardContent>
    </Card>
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
  const feudKills = await getGuildFeudKillsFromDb(region, guildA, guildB, {
    limit: 10,
    excludeEventId,
  });

  const feudHref =
    guildAId && guildBId
      ? `/feud/${region}/${guildAId}/${guildBId}`
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Guild Feud</CardTitle>
          <p className="text-sm text-muted-foreground">
            {guildA} vs {guildB}
          </p>
        </div>
        {feudHref && (
          <Link
            href={feudHref}
            className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
          >
            Full feud
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {feudKills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No other recent kills between these guilds in our database
          </p>
        ) : (
          <div className="space-y-3">
            {feudKills.map((feudEvent) => (
              <KillCard
                key={`feud-${feudEvent.eventId}`}
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
