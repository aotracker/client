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
import {
  decodeEntitySegment,
  resolvePlayerAlbionId,
} from "@/lib/entity-resolve";
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
import { notFound, permanentRedirect } from "next/navigation";
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
  params: Promise<{ region: string; playerName?: string; playerId?: string }>;
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
    isSyncStale(player.historyLastSyncedAt)
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
  const { region } = resolvedParams;
  const playerName = playerSegmentFromParams(resolvedParams);
  if (!isRegionEnabled(region)) return notFoundMetadata();

  const albionRegion = region as AlbionRegion;
  const resolved = await resolvePlayerAlbionId(albionRegion, playerName);
  if (!resolved) {
    return pendingEntityMetadata(
      "Player",
      entityPath("player", region, decodeEntitySegment(playerName))
    );
  }

  const profile = await loadPlayerProfile(albionRegion, resolved.albionId);
  if (!profile) {
    return pendingEntityMetadata(
      "Player",
      entityPath("player", region, decodeEntitySegment(playerName))
    );
  }

  const { player } = profile;
  const path = entityPath("player", region, player.name);
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
  const resolvedParams = await params;
  const { region } = resolvedParams;
  const playerName = playerSegmentFromParams(resolvedParams);
  if (!playerName) notFound();
  if (!isRegionEnabled(region)) notFound();

  const albionRegion = region as AlbionRegion;
  const resolved = await resolvePlayerAlbionId(albionRegion, playerName);
  if (!resolved) notFound();
  if (resolved.redirectTo) permanentRedirect(resolved.redirectTo);

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

  return (
    <div className="space-y-6">
      <JsonLd
        data={playerJsonLd({
          name: player.name,
          url: entityCanonical("player", albionRegion, player.name),
          regionLabel: regionLabel(albionRegion),
          guildName: player.guild?.name,
          killFame: player.killFame,
          deathFame: player.deathFame,
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

      <Suspense fallback={<PlayerAnalyticsFallback />}>
        <PlayerAnalyticsSection region={albionRegion} playerId={albionId} />
      </Suspense>

      <Suspense fallback={<PlayerAssociationsFallback />}>
        <PlayerAssociationsSection region={albionRegion} playerId={albionId} />
      </Suspense>

      <Suspense fallback={<PlayerHistoryFallback />}>
        <PlayerHistorySection
          region={albionRegion}
          playerId={albionId}
          historyLastSyncedAt={player.historyLastSyncedAt}
        />
      </Suspense>
    </div>
  );
}
