import { notFound, permanentRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { withLocalePrefix } from "@/i18n/locales";
import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { KillCard } from "@/components/KillCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatValue } from "@/components/StatValue";
import {
  getGuildFeudKillsFromDb,
  getGuildFeudStats,
} from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import { resolveFeudFromSegments } from "@/lib/entity-resolve";
import { formatFame, regionLabel } from "@/lib/utils";
import { buildPageMetadata, feudPath, notFoundMetadata } from "@/lib/seo";

interface PageProps {
  params: Promise<{
    region: string;
    guildAName: string;
    guildBName: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region, guildAName, guildBName } = await params;
  if (!isRegionEnabled(region)) return notFoundMetadata();

  const albionRegion = region as AlbionRegion;
  const resolved = await resolveFeudFromSegments(
    albionRegion,
    guildAName,
    guildBName
  );
  if (!resolved) return notFoundMetadata();

  const { guildA, guildB } = resolved;

  return buildPageMetadata({
    title: `${guildA.name} vs ${guildB.name} — Guild Feud`,
    description: `Head-to-head PvP stats and recent kills between ${guildA.name} and ${guildB.name} on ${regionLabel(albionRegion)}.`,
    canonicalPath: feudPath(region, guildA.name, guildB.name),
  });
}

export default async function GuildFeudPage({ params }: PageProps) {
  const { region, guildAName, guildBName } = await params;
  if (!isRegionEnabled(region)) notFound();

  const albionRegion = region as AlbionRegion;
  const resolved = await resolveFeudFromSegments(
    albionRegion,
    guildAName,
    guildBName
  );
  if (!resolved) notFound();
  if (resolved.redirectTo) {
    permanentRedirect(
      withLocalePrefix(await getLocale(), resolved.redirectTo)
    );
  }

  const { guildA, guildB } = resolved;

  const stats = await getGuildFeudStats(
    albionRegion,
    guildA.name,
    guildB.name
  );

  const feudKills = await getGuildFeudKillsFromDb(
    albionRegion,
    guildA.name,
    guildB.name,
    { limit: 25 }
  );

  const aKillsB = stats?.aKillsB ?? 0;
  const bKillsA = stats?.bKillsA ?? 0;

  return (
    <div className="space-y-6">
      <BackLink />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {guildA.name} vs {guildB.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Guild feud · {regionLabel(albionRegion)} · from cached kill data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Head-to-head</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-md border border-border/60 p-4">
            <p className="text-sm font-medium">{guildA.name} kills</p>
            <StatValue
              label="Kills"
              value={String(aKillsB)}
              variant="kill"
              size="header"
            />
            <p className="text-sm text-stat-fame">
              {formatFame(stats?.aFameOnB ?? 0)} fame
            </p>
          </div>
          <div className="space-y-2 rounded-md border border-border/60 p-4">
            <p className="text-sm font-medium">{guildB.name} kills</p>
            <StatValue
              label="Kills"
              value={String(bKillsA)}
              variant="kill"
              size="header"
            />
            <p className="text-sm text-stat-fame">
              {formatFame(stats?.bFameOnA ?? 0)} fame
            </p>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent feud kills</h2>
        {feudKills.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No kills between these guilds in our database yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {feudKills.map((event) => (
              <KillCard
                key={`feud-${event.eventId}`}
                event={event}
                compact
                compactSize="large"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
