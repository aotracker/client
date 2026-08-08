import { Suspense, cache } from "react";
import { after } from "next/server";
import type { Metadata } from "next";
import {
  getAllianceFameFromMemberGuilds,
  getAllianceProfileFromDb,
} from "@/lib/db/queries";
import { isSyncStale } from "@/lib/db/sync";
import {
  ensureAllianceRefreshQueued,
  getAllianceRefreshJobState,
} from "@/lib/jobs/queue";
import { isAllianceDataIngesting } from "@/lib/ingest-status";
import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import { AllianceHeaderSection } from "@/components/alliance/AllianceHeaderSection";
import {
  AllianceBattlesSections,
  AllianceBattlesSectionsFallback,
} from "@/components/AllianceBattlesSections";
import { BackLink } from "@/components/BackLink";
import { IngestingBanner } from "@/components/IngestingBanner";
import { ProfileFetchPending } from "@/components/ProfileFetchPending";
import {
  AllianceTopKillsFallback,
  AllianceTopKillsSection,
} from "@/components/alliance/AllianceTopKillsSection";
import { EntityHeaderSkeleton } from "@/components/ui/skeleton";
import { notFound } from "next/navigation";
import { formatFame, regionLabel } from "@/lib/utils";
import { JsonLd, organizationJsonLd } from "@/components/JsonLd";
import {
  albionEntityTitle,
  allianceSeoDescription,
  buildPageMetadata,
  entityCanonical,
  entityPath,
  notFoundMetadata,
  pendingEntityMetadata,
} from "@/lib/seo";

interface PageProps {
  params: Promise<{ region: string; allianceId: string }>;
}

const loadAllianceProfile = cache(async function loadAllianceProfile(
  region: AlbionRegion,
  allianceId: string
) {
  const profile = await getAllianceProfileFromDb(region, allianceId);

  if (!profile) {
    return null;
  }

  const shouldRefreshProfile =
    !profile.alliance.lastSyncedAt ||
    isSyncStale(profile.alliance.lastSyncedAt) ||
    !profile.alliance.battlesLastSyncedAt ||
    isSyncStale(profile.alliance.battlesLastSyncedAt);

  if (shouldRefreshProfile) {
    after(() => ensureAllianceRefreshQueued(region, allianceId));
  }

  return profile;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region, allianceId } = await params;
  if (!isRegionEnabled(region)) return notFoundMetadata();
  const path = entityPath("alliance", region, allianceId);
  const data = await loadAllianceProfile(region as AlbionRegion, allianceId);
  if (!data) return pendingEntityMetadata("Alliance", path);

  const displayName = data.info.tag
    ? `[${data.info.tag}] ${data.info.name}`
    : data.info.name;
  const fame = await getAllianceFameFromMemberGuilds(
    region as AlbionRegion,
    allianceId
  );

  return buildPageMetadata({
    title: albionEntityTitle(displayName, "alliance", region),
    description: allianceSeoDescription({
      name: displayName,
      region,
      memberCount: data.memberCount,
      guildCount: data.guilds.length,
      killFame: fame.killFame,
      deathFame: fame.deathFame,
      founderName: data.info.founderName,
      founded: data.info.founded,
    }),
    canonicalPath: path,
  });
}

export default async function AllianceProfilePage({ params }: PageProps) {
  const { region, allianceId } = await params;
  if (!isRegionEnabled(region)) notFound();
  const albionRegion = region as AlbionRegion;
  const data = await loadAllianceProfile(albionRegion, allianceId);

  if (!data) {
    await ensureAllianceRefreshQueued(albionRegion, allianceId, { immediate: true });
    const refreshJobState = await getAllianceRefreshJobState(albionRegion, allianceId);
    return (
      <ProfileFetchPending
        entityType="alliance"
        region={albionRegion}
        entityId={allianceId}
        jobState={refreshJobState}
      />
    );
  }

  const { alliance, info, guilds, memberCount } = data;
  const refreshJobState = await getAllianceRefreshJobState(albionRegion, allianceId);
  const isIngesting = isAllianceDataIngesting({
    lastSyncedAt: alliance.lastSyncedAt,
    battlesLastSyncedAt: alliance.battlesLastSyncedAt,
    refreshJobState,
  });

  const displayName = info.tag ? `[${info.tag}] ${info.name}` : info.name;
  const descriptionFame =
    alliance.killFame ||
    (await getAllianceFameFromMemberGuilds(albionRegion, allianceId)).killFame;

  return (
    <div className="space-y-6">
      <JsonLd
        data={organizationJsonLd({
          name: displayName,
          url: entityCanonical("alliance", albionRegion, allianceId),
          regionLabel: regionLabel(albionRegion),
          memberCount,
          description: `${displayName} alliance on ${regionLabel(albionRegion)} · ${formatFame(descriptionFame)} kill fame · ${guilds.length} guilds`,
        })}
      />
      <BackLink />
      {isIngesting && <IngestingBanner entityType="alliance" />}

      <Suspense fallback={<EntityHeaderSkeleton />}>
        <AllianceHeaderSection
          region={albionRegion}
          allianceId={allianceId}
          alliance={alliance}
          info={info}
          guilds={guilds}
          memberCount={memberCount}
        />
      </Suspense>

      <Suspense fallback={<AllianceTopKillsFallback />}>
        <AllianceTopKillsSection region={albionRegion} allianceId={allianceId} />
      </Suspense>

      <Suspense fallback={<AllianceBattlesSectionsFallback />}>
        <AllianceBattlesSections
          region={albionRegion}
          allianceId={allianceId}
        />
      </Suspense>
    </div>
  );
}
