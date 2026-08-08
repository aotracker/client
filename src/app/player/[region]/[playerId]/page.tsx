import { cache } from "react";
import { Suspense } from "react";
import { after } from "next/server";
import type { Metadata } from "next";
import { getPlayerProfile } from "@/lib/db/queries";
import { isSyncStale } from "@/lib/db/sync";
import {
  ensurePlayerSyncQueued,
  getPlayerSyncJobState,
} from "@/lib/jobs/queue";
import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import { regionLabel } from "@/lib/utils";
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
import { notFound } from "next/navigation";
import { JsonLd, playerJsonLd } from "@/components/JsonLd";
import {
  albionEntityTitle,
  buildPageMetadata,
  entityCanonical,
  entityPath,
  notFoundMetadata,
  pendingEntityMetadata,
  playerSeoDescription,
} from "@/lib/seo";

interface PageProps {
  params: Promise<{ region: string; playerId: string }>;
}

function needsPlayerSync(player: {
  lastSyncedAt: Date | null;
  historyLastSyncedAt: Date | null;
}): boolean {
  return (
    !player.lastSyncedAt ||
    isSyncStale(player.lastSyncedAt) ||
    !player.historyLastSyncedAt ||
    isSyncStale(player.historyLastSyncedAt)
  );
}

const loadPlayerProfile = cache(async function loadPlayerProfile(
  region: AlbionRegion,
  playerId: string
) {
  const profile = await getPlayerProfile(region, playerId);

  if (!profile) {
    return null;
  }

  if (needsPlayerSync(profile.player)) {
    after(() => ensurePlayerSyncQueued(region, playerId));
  }

  return profile;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region, playerId } = await params;
  if (!isRegionEnabled(region)) return notFoundMetadata();
  const path = entityPath("player", region, playerId);
  const profile = await loadPlayerProfile(region as AlbionRegion, playerId);
  if (!profile) return pendingEntityMetadata("Player", path);

  const { player } = profile;
  const allianceName = player.guild?.allianceName ?? player.allianceName;

  return buildPageMetadata({
    title: albionEntityTitle(player.name, "player", region),
    description: playerSeoDescription({
      name: player.name,
      region,
      killFame: player.killFame,
      deathFame: player.deathFame,
      fameRatio: player.fameRatio,
      guildName: player.guild?.name,
      allianceName,
    }),
    canonicalPath: path,
    openGraphType: "profile",
  });
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { region, playerId } = await params;
  if (!isRegionEnabled(region)) notFound();
  const albionRegion = region as AlbionRegion;
  const profile = await loadPlayerProfile(albionRegion, playerId);

  if (!profile) {
    await ensurePlayerSyncQueued(albionRegion, playerId, { immediate: true });
    const syncJobState = await getPlayerSyncJobState(albionRegion, playerId);
    return (
      <ProfileFetchPending
        entityType="player"
        region={albionRegion}
        entityId={playerId}
        jobState={syncJobState}
      />
    );
  }

  const { player } = profile;

  return (
    <div className="space-y-6">
      <JsonLd
        data={playerJsonLd({
          name: player.name,
          url: entityCanonical("player", albionRegion, playerId),
          regionLabel: regionLabel(albionRegion),
          guildName: player.guild?.name,
          killFame: player.killFame,
          deathFame: player.deathFame,
        })}
      />

      <Suspense fallback={null}>
        <PlayerIngestingBanner
          region={albionRegion}
          playerId={playerId}
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
        sharePath={entityPath("player", albionRegion, playerId)}
      />

      <Suspense fallback={<PlayerAnalyticsFallback />}>
        <PlayerAnalyticsSection region={albionRegion} playerId={playerId} />
      </Suspense>

      <Suspense fallback={<PlayerAssociationsFallback />}>
        <PlayerAssociationsSection region={albionRegion} playerId={playerId} />
      </Suspense>

      <Suspense fallback={<PlayerHistoryFallback />}>
        <PlayerHistorySection
          region={albionRegion}
          playerId={playerId}
          historyLastSyncedAt={player.historyLastSyncedAt}
        />
      </Suspense>
    </div>
  );
}
