import { Suspense, cache } from "react";
import { after } from "next/server";
import type { Metadata } from "next";
import {
  getGuildByAlbionId,
} from "@/lib/db/queries";
import { isSyncStale } from "@/lib/db/sync";
import {
  ensureGuildSyncQueued,
  getGuildSyncJobState,
} from "@/lib/jobs/queue";
import { guildBattleListNeedsRefresh } from "@/lib/albion/battles";
import { isGuildDataIngesting } from "@/lib/ingest-status";
import { resolveAllianceDisplay } from "@/lib/albion/alliance-info";
import type { AlbionGuildInfo, AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import { BackLink } from "@/components/BackLink";
import { GuildHeader } from "@/components/GuildHeader";
import { IngestingBanner } from "@/components/IngestingBanner";
import { ProfileFetchPending } from "@/components/ProfileFetchPending";
import {
  GuildBattlesSections,
  GuildBattlesSectionsFallback,
} from "@/components/GuildTopBattlesSection";
import {
  GuildRivalsFallback,
  GuildRivalsPanel,
} from "@/components/guild/GuildRivalsPanel";
import {
  GuildTopKillsFallback,
  GuildTopKillsSection,
} from "@/components/guild/GuildTopKillsSection";
import { formatFame, regionLabel } from "@/lib/utils";
import { notFound } from "next/navigation";
import { JsonLd, organizationJsonLd } from "@/components/JsonLd";
import {
  albionEntityTitle,
  buildPageMetadata,
  entityCanonical,
  entityPath,
  guildSeoDescription,
  notFoundMetadata,
  pendingEntityMetadata,
} from "@/lib/seo";

interface PageProps {
  params: Promise<{ region: string; guildId: string }>;
}

function guildHeaderFromDb(
  guild: NonNullable<Awaited<ReturnType<typeof getGuildByAlbionId>>>
) {
  const payload = guild.rawPayload as AlbionGuildInfo | null;

  return {
    name: guild.name,
    albionId: guild.albionId,
    region: guild.region,
    killFame: guild.killFame ?? null,
    deathFame: guild.deathFame ?? null,
    memberCount: guild.memberCount ?? null,
    founderId: payload?.FounderId ?? null,
    founderName: payload?.FounderName ?? null,
    founded: payload?.Founded ?? null,
    allianceId: guild.allianceId?.trim() || null,
    allianceName: guild.allianceName?.trim() || null,
    allianceTag: guild.allianceTag?.trim() || payload?.AllianceTag?.trim() || null,
    lastSyncedAt: guild.lastSyncedAt,
  };
}

async function enrichAllianceInfo(
  region: AlbionRegion,
  header: ReturnType<typeof guildHeaderFromDb>
) {
  if (!header.allianceId) return header;
  if (header.allianceName) return header;

  const alliance = await resolveAllianceDisplay(region, header.allianceId);
  if (!alliance) return header;

  return {
    ...header,
    allianceName: alliance.name,
    allianceTag: header.allianceTag ?? alliance.tag,
  };
}

function needsGuildSync(guild: {
  lastSyncedAt: Date | null;
  historyLastSyncedAt: Date | null;
  battlesLastSyncedAt: Date | null;
  recentBattlesPayload: unknown;
  topBattlesPayload: unknown;
}): boolean {
  return (
    !guild.lastSyncedAt ||
    isSyncStale(guild.lastSyncedAt) ||
    !guild.historyLastSyncedAt ||
    isSyncStale(guild.historyLastSyncedAt) ||
    guildBattleListNeedsRefresh(
      guild.recentBattlesPayload,
      guild.topBattlesPayload,
      guild.battlesLastSyncedAt
    ) ||
    guildBattleListNeedsRefresh(
      guild.topBattlesPayload,
      guild.recentBattlesPayload,
      guild.battlesLastSyncedAt
    )
  );
}

const loadGuildProfile = cache(async function loadGuildProfile(
  region: AlbionRegion,
  guildId: string
) {
  const dbGuild = await getGuildByAlbionId(region, guildId);

  if (!dbGuild) {
    return null;
  }

  const shouldSync = needsGuildSync(dbGuild);
  if (shouldSync) {
    after(() => ensureGuildSyncQueued(region, guildId));
  }

  const header = await enrichAllianceInfo(region, guildHeaderFromDb(dbGuild));

  return {
    header,
    lastSyncedAt: dbGuild.lastSyncedAt,
    historyLastSyncedAt: dbGuild.historyLastSyncedAt,
    battlesLastSyncedAt: dbGuild.battlesLastSyncedAt,
  };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region, guildId } = await params;
  if (!isRegionEnabled(region)) return notFoundMetadata();
  const path = entityPath("guild", region, guildId);
  const profile = await loadGuildProfile(region as AlbionRegion, guildId);
  if (!profile) return pendingEntityMetadata("Guild", path);

  const { header } = profile;

  return buildPageMetadata({
    title: albionEntityTitle(header.name, "guild", region),
    description: guildSeoDescription({
      name: header.name,
      region,
      killFame: header.killFame,
      deathFame: header.deathFame,
      memberCount: header.memberCount,
      allianceName: header.allianceName,
      allianceTag: header.allianceTag,
      founderName: header.founderName,
      founded: header.founded,
    }),
    canonicalPath: path,
  });
}

export default async function GuildProfilePage({ params }: PageProps) {
  const { region, guildId } = await params;
  if (!isRegionEnabled(region)) notFound();
  const albionRegion = region as AlbionRegion;
  const profile = await loadGuildProfile(albionRegion, guildId);

  if (!profile) {
    await ensureGuildSyncQueued(albionRegion, guildId, { immediate: true });
    const syncJobState = await getGuildSyncJobState(albionRegion, guildId);
    return (
      <ProfileFetchPending
        entityType="guild"
        region={albionRegion}
        entityId={guildId}
        jobState={syncJobState}
      />
    );
  }

  const {
    header,
    lastSyncedAt,
    historyLastSyncedAt,
    battlesLastSyncedAt,
  } = profile;
  const syncJobState = await getGuildSyncJobState(albionRegion, guildId);
  const isIngesting = isGuildDataIngesting({
    lastSyncedAt,
    historyLastSyncedAt,
    battlesLastSyncedAt,
    syncJobState,
  });

  return (
    <div className="space-y-6">
      <JsonLd
        data={organizationJsonLd({
          name: header.name,
          url: entityCanonical("guild", albionRegion, guildId),
          regionLabel: regionLabel(albionRegion),
          memberCount: header.memberCount,
          description: `${header.name} guild on ${regionLabel(albionRegion)} · ${formatFame(header.killFame)} kill fame`,
        })}
      />
      <BackLink />
      {isIngesting && <IngestingBanner entityType="guild" />}

      <GuildHeader
        guild={header}
        sharePath={entityPath("guild", albionRegion, guildId)}
      />

      <Suspense fallback={<GuildTopKillsFallback />}>
        <GuildTopKillsSection
          region={albionRegion}
          guildId={guildId}
          historyLastSyncedAt={historyLastSyncedAt}
        />
      </Suspense>

      <Suspense fallback={<GuildRivalsFallback />}>
        <GuildRivalsPanel
          region={albionRegion}
          guildId={guildId}
          guildName={header.name}
        />
      </Suspense>

      <Suspense fallback={<GuildBattlesSectionsFallback />}>
        <GuildBattlesSections region={albionRegion} guildId={guildId} />
      </Suspense>
    </div>
  );
}
