import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { KillCard } from "@/components/KillCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatValue } from "@/components/StatValue";
import {
  getAllianceByAlbionId,
  getAllianceFeudKillsFromDb,
  getAllianceFeudStats,
} from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import { formatFame, regionLabel } from "@/lib/utils";
import {
  allianceFeudPath,
  alliancePath,
  buildPageMetadata,
  notFoundMetadata,
} from "@/lib/seo";
import { Link } from "@/i18n/navigation";

interface PageProps {
  params: Promise<{
    region: string;
    allianceAId: string;
    allianceBId: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { region, allianceAId, allianceBId } = await params;
  if (!isRegionEnabled(region)) return notFoundMetadata();

  const albionRegion = region as AlbionRegion;
  const [allianceA, allianceB] = await Promise.all([
    getAllianceByAlbionId(albionRegion, allianceAId),
    getAllianceByAlbionId(albionRegion, allianceBId),
  ]);
  const nameA = allianceA?.name ?? allianceAId;
  const nameB = allianceB?.name ?? allianceBId;

  return buildPageMetadata({
    title: `${nameA} vs ${nameB} — Alliance Feud`,
    description: `Head-to-head PvP stats and recent kills between ${nameA} and ${nameB} on ${regionLabel(albionRegion)}.`,
    canonicalPath: allianceFeudPath(region, allianceAId, allianceBId),
  });
}

export default async function AllianceFeudPage({ params }: PageProps) {
  const { region, allianceAId, allianceBId } = await params;
  if (!isRegionEnabled(region)) notFound();

  const albionRegion = region as AlbionRegion;
  const [allianceA, allianceB] = await Promise.all([
    getAllianceByAlbionId(albionRegion, allianceAId),
    getAllianceByAlbionId(albionRegion, allianceBId),
  ]);
  const nameA = allianceA?.name ?? allianceAId;
  const nameB = allianceB?.name ?? allianceBId;
  const idA = allianceA?.albionId ?? allianceAId;
  const idB = allianceB?.albionId ?? allianceBId;

  const stats = await getAllianceFeudStats(albionRegion, idA, idB);
  const feudKills = await getAllianceFeudKillsFromDb(
    albionRegion,
    idA,
    idB,
    { limit: 25 }
  );

  return (
    <div className="space-y-6">
      <BackLink />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          <Link
            href={alliancePath(albionRegion, idA)}
            className="hover:text-primary hover:underline"
          >
            {nameA}
          </Link>
          {" vs "}
          <Link
            href={alliancePath(albionRegion, idB)}
            className="hover:text-primary hover:underline"
          >
            {nameB}
          </Link>
        </h1>
        <p className="text-sm text-muted-foreground">
          Alliance feud · {regionLabel(albionRegion)} · from cached kill data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Head-to-head</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-md border border-border/60 p-4">
            <p className="text-sm font-medium">{nameA} kills</p>
            <StatValue
              label="Kills"
              value={String(stats.aKillsB)}
              variant="kill"
              size="header"
            />
            <p className="text-sm text-stat-fame">
              {formatFame(stats.aFameOnB)} fame
            </p>
          </div>
          <div className="space-y-2 rounded-md border border-border/60 p-4">
            <p className="text-sm font-medium">{nameB} kills</p>
            <StatValue
              label="Kills"
              value={String(stats.bKillsA)}
              variant="kill"
              size="header"
            />
            <p className="text-sm text-stat-fame">
              {formatFame(stats.bFameOnA)} fame
            </p>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent feud kills</h2>
        {feudKills.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No kills between these alliances in our database yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {feudKills.map((event) => (
              <KillCard
                key={`alliance-feud-${event.eventId}`}
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
