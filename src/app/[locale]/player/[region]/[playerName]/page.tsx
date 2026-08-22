import { cache } from "react";
import { Suspense } from "react";
import { after } from "next/server";
import type { Metadata } from "next";
import { getPlayerProfile } from "@/lib/db/queries";
import { isSyncStale, HISTORY_SYNC_STALE_MS } from "@/lib/db/sync";
import {
  ensurePlayerSyncQueued,
  getPlayerSyncJobState,
} from "@/lib/jobs/queue";
import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import {
  decodeEntitySegment,
  getEntityResolveJobStateForPending,
  resolvePlayerAlbionId,
} from "@/lib/entity-resolve";
import { getLocaleDefinition, withLocalePrefix } from "@/i18n/locales";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileFetchPending } from "@/components/ProfileFetchPending";
import {
  PlayerAnalyticsFallback,
  PlayerAnalyticsSection,
  PlayerHistoryFallback,
  PlayerHistorySection,
  PlayerIngestingBanner,
} from "@/components/player/PlayerProfileSections";
import {
  PlayerAssociationsFallback,
  PlayerAssociationsSection,
} from "@/components/player/PlayerAssociationsSection";
import { PlayerProfileNav } from "@/components/player/PlayerProfileNav";
import { notFound, permanentRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { JsonLd, playerJsonLd } from "@/components/JsonLd";
import { entityCanonical, entityPath, notFoundMetadata } from "@/lib/seo";
import {
  albionEntityTitle,
  buildLocalizedPageMetadata,
  pendingEntityMetadata,
  playerSeoDescription,
  translatedRegionLabel,
} from "@/lib/seo-metadata";

interface PageProps {
  params: Promise<{
    locale: string;
    region: string;
    playerName?: string;
    playerId?: string;
  }>;
}

function playerSegmentFromParams(params: {
  playerName?: string;
  playerId?: string;
}): string {
  return (params.playerName ?? params.playerId ?? "").trim();
}

function needsPlayerSync(player: {
  lastSyncedAt: Date | null;
  historyLastSyncedAt: Date | null;
}): boolean {
  return (
    !player.lastSyncedAt ||
    isSyncStale(player.lastSyncedAt) ||
    !player.historyLastSyncedAt ||
    isSyncStale(player.historyLastSyncedAt, HISTORY_SYNC_STALE_MS)
  );
}

const loadPlayerProfile = cache(async function loadPlayerProfile(
  region: AlbionRegion,
  albionId: string
) {
  const profile = await getPlayerProfile(region, albionId);

  if (!profile) {
    return null;
  }

  if (needsPlayerSync(profile.player)) {
    after(() => ensurePlayerSyncQueued(region, albionId));
  }

  return profile;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { locale, region } = resolvedParams;
  const playerName = playerSegmentFromParams(resolvedParams);
  if (!isRegionEnabled(region)) return notFoundMetadata();

  const albionRegion = region as AlbionRegion;
  const resolved = await resolvePlayerAlbionId(albionRegion, playerName);
  if (!resolved || !("albionId" in resolved)) {
    return pendingEntityMetadata(
      "player",
      entityPath("player", region, decodeEntitySegment(playerName)),
      locale
    );
  }

  const profile = await loadPlayerProfile(albionRegion, resolved.albionId);
  if (!profile) {
    return pendingEntityMetadata(
      "player",
      entityPath("player", region, decodeEntitySegment(playerName)),
      locale
    );
  }

  const { player } = profile;
  const path = entityPath("player", region, player.name);
  const allianceName = player.guild?.allianceName ?? player.allianceName;

  return buildLocalizedPageMetadata({
    title: await albionEntityTitle(player.name, "player", region, locale),
    description: await playerSeoDescription(
      {
        name: player.name,
        region,
        killFame: player.killFame,
        deathFame: player.deathFame,
        fameRatio: player.fameRatio,
        guildName: player.guild?.name,
        allianceName,
      },
      locale
    ),
    canonicalPath: path,
    openGraphType: "profile",
    locale,
  });
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const resolvedParams = await params;
  const { region } = resolvedParams;
  const playerName = playerSegmentFromParams(resolvedParams);
  if (!playerName) notFound();
  if (!isRegionEnabled(region)) notFound();

  const albionRegion = region as AlbionRegion;
  const resolved = await resolvePlayerAlbionId(albionRegion, playerName);
  if (!resolved) notFound();
  if ("pending" in resolved) {
    const jobState = await getEntityResolveJobStateForPending(
      albionRegion,
      resolved.entityType,
      resolved.entityName
    );
    return (
      <ProfileFetchPending
        entityType="player"
        region={albionRegion}
        entityName={resolved.entityName}
        jobState={jobState}
      />
    );
  }
  if (resolved.redirectTo) {
    permanentRedirect(
      withLocalePrefix(await getLocale(), resolved.redirectTo)
    );
  }

  const { albionId } = resolved;
  const profile = await loadPlayerProfile(albionRegion, albionId);

  if (!profile) {
    await ensurePlayerSyncQueued(albionRegion, albionId, { immediate: true });
    const syncJobState = await getPlayerSyncJobState(albionRegion, albionId);
    return (
      <ProfileFetchPending
        entityType="player"
        region={albionRegion}
        entityId={albionId}
        jobState={syncJobState}
      />
    );
  }

  const { player } = profile;
  const canonicalPath = entityPath("player", albionRegion, player.name);
  const locale = await getLocale();
  const regionName = await translatedRegionLabel(albionRegion, locale);

  return (
    <div className="space-y-6">
      <JsonLd
        data={playerJsonLd({
          name: player.name,
          url: entityCanonical("player", albionRegion, player.name, locale),
          regionLabel: regionName,
          guildName: player.guild?.name,
          killFame: player.killFame,
          deathFame: player.deathFame,
          inLanguage: getLocaleDefinition(locale).htmlLang,
        })}
      />

      <Suspense fallback={null}>
        <PlayerIngestingBanner
          region={albionRegion}
          playerId={albionId}
          lastSyncedAt={player.lastSyncedAt}
          historyLastSyncedAt={player.historyLastSyncedAt}
        />
      </Suspense>

      <ProfileHeader
        player={{
          ...player,
          lifetimeStats: (player.lifetimeStats ?? null) as Record<
            string,
            unknown
          > | null,
        }}
        sharePath={canonicalPath}
      />

      <PlayerProfileNav />

      <div id="activity" className="scroll-mt-28">
        <Suspense fallback={<PlayerHistoryFallback />}>
          <PlayerHistorySection
            region={albionRegion}
            playerId={albionId}
            historyLastSyncedAt={player.historyLastSyncedAt}
          />
        </Suspense>
      </div>

      <div id="analytics" className="scroll-mt-28">
        <Suspense fallback={<PlayerAnalyticsFallback />}>
          <PlayerAnalyticsSection region={albionRegion} playerId={albionId} />
        </Suspense>
      </div>

      <div id="allies" className="scroll-mt-28">
        <Suspense fallback={<PlayerAssociationsFallback />}>
          <PlayerAssociationsSection
            region={albionRegion}
            playerId={albionId}
          />
        </Suspense>
      </div>
    </div>
  );
}
