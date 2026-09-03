import { Suspense, cache } from "react";
import { after } from "next/server";
import type { Metadata } from "next";
import {
  getAllianceFameFromMemberGuilds,
  getAllianceProfileFromDb,
} from "@/lib/db/queries";
import { isSyncStale } from "@/lib/db/sync";
import { guildBattleListNeedsRefresh } from "@/lib/albion/battles";
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
import { AllianceProfileNav } from "@/components/alliance/AllianceProfileNav";
import { AllianceMediaSection } from "@/components/media/AllianceMediaSection";
import { allianceHasAttachedMedia } from "@/lib/db/queries/media";
import { EntityHeaderSkeleton } from "@/components/ui/skeleton";
import { notFound } from "next/navigation";
import { formatFame } from "@/lib/utils";
import { getLocale } from "next-intl/server";
import { getLocaleDefinition } from "@/i18n/locales";
import { JsonLd, organizationJsonLd } from "@/components/JsonLd";
import { entityCanonical, entityPath, notFoundMetadata } from "@/lib/seo";
import {
  albionEntityTitle,
  allianceSeoDescription,
  buildLocalizedPageMetadata,
  pendingEntityMetadata,
  translatedRegionLabel,
} from "@/lib/seo-metadata";

interface PageProps {
  params: Promise<{ locale: string; region: string; allianceId: string }>;
}

const loadAllianceProfile = cache(async function loadAllianceProfile(
  region: AlbionRegion,
  allianceId: string
) {
  const profile = await getAllianceProfileFromDb(region, allianceId);

  if (!profile) {
    return null;
  }

  const { alliance } = profile;
  const shouldRefreshProfile =
    !alliance.lastSyncedAt ||
    isSyncStale(alliance.lastSyncedAt) ||
    guildBattleListNeedsRefresh(
      alliance.recentBattlesPayload,
      alliance.topBattlesPayload,
      alliance.battlesLastSyncedAt,
      { requireAlliancePreview: true }
    ) ||
    guildBattleListNeedsRefresh(
      alliance.topBattlesPayload,
      alliance.recentBattlesPayload,
      alliance.battlesLastSyncedAt,
      { requireAlliancePreview: true }
    );

  if (shouldRefreshProfile) {
    after(() => ensureAllianceRefreshQueued(region, allianceId));
  }

  return profile;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, region, allianceId } = await params;
  if (!isRegionEnabled(region)) return notFoundMetadata();
  const path = entityPath("alliance", region, allianceId);
  const data = await loadAllianceProfile(region as AlbionRegion, allianceId);
  if (!data) return pendingEntityMetadata("alliance", path, locale);

  const displayName = data.info.tag
    ? `[${data.info.tag}] ${data.info.name}`
    : data.info.name;
  const fame = await getAllianceFameFromMemberGuilds(
    region as AlbionRegion,
    allianceId
  );

  return buildLocalizedPageMetadata({
    title: await albionEntityTitle(displayName, "alliance", region, locale),
    description: await allianceSeoDescription(
      {
        name: displayName,
        region,
        memberCount: data.memberCount,
        guildCount: data.guilds.length,
        killFame: fame.killFame,
        deathFame: fame.deathFame,
        founderName: data.info.founderName,
        founded: data.info.founded,
      },
      locale
    ),
    canonicalPath: path,
    locale,
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
  const locale = await getLocale();
  const regionName = await translatedRegionLabel(albionRegion, locale);
  const hasMedia = await allianceHasAttachedMedia(albionRegion, allianceId);

  return (
    <div className="space-y-6">
      <JsonLd
        data={organizationJsonLd({
          name: displayName,
          url: entityCanonical("alliance", albionRegion, allianceId, locale),
          regionLabel: regionName,
          memberCount,
          description: `${displayName} alliance on ${regionName} · ${formatFame(descriptionFame)} kill fame · ${guilds.length} guilds`,
          inLanguage: getLocaleDefinition(locale).htmlLang,
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

      <AllianceProfileNav hasMedia={hasMedia} />

      <div id="kills" className="scroll-mt-28">
        <Suspense fallback={<AllianceTopKillsFallback />}>
          <AllianceTopKillsSection
            region={albionRegion}
            allianceId={allianceId}
          />
        </Suspense>
      </div>

      <div id="battles" className="scroll-mt-28">
        <Suspense fallback={<AllianceBattlesSectionsFallback />}>
          <AllianceBattlesSections
            region={albionRegion}
            allianceId={allianceId}
          />
        </Suspense>
      </div>

      {hasMedia ? (
        <div id="media" className="scroll-mt-28">
          <Suspense fallback={null}>
            <AllianceMediaSection region={albionRegion} allianceId={allianceId} />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
