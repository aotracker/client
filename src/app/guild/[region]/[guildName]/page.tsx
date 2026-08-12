import { Suspense, cache } from "react";
import { after } from "next/server";
import type { Metadata } from "next";
import { getGuildByAlbionId } from "@/lib/db/queries";
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
import { GuildProfileNav } from "@/components/guild/GuildProfileNav";
import {
  decodeEntitySegment,
  getEntityResolveJobStateForPending,
  resolveGuildAlbionId,
} from "@/lib/entity-resolve";
import { formatFame, regionLabel } from "@/lib/utils";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd, organizationJsonLd } from "@/components/JsonLd";
import {
  albionEntityTitle,
  buildPageMetadata,
  entityCanonical,
  entityPath,
  notFoundMetadata,
  pendingEntityMetadata,
  guildSeoDescription,
} from "@/lib/seo";

interface PageProps {
  params: Promise<{ region: string; guildName: string }>;
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
  albionId: string
) {
  const dbGuild = await getGuildByAlbionId(region, albionId);

  if (!dbGuild) {
    return null;
  }

  const shouldSync = needsGuildSync(dbGuild);
  if (shouldSync) {
    after(() => ensureGuildSyncQueued(region, albionId));
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
  const { region, guildName } = await params;
  if (!isRegionEnabled(region)) return notFoundMetadata();

  const albionRegion = region as AlbionRegion;
  const resolved = await resolveGuildAlbionId(albionRegion, guildName);
  if (!resolved || !("albionId" in resolved)) {
    return pendingEntityMetadata(
      "Guild",
      entityPath("guild", region, decodeEntitySegment(guildName))
    );
  }

  const profile = await loadGuildProfile(albionRegion, resolved.albionId);
  if (!profile) {
    return pendingEntityMetadata(
      "Guild",
      entityPath("guild", region, decodeEntitySegment(guildName))
    );
  }

  const { header } = profile;
  const path = entityPath("guild", region, header.name);

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
  const { region, guildName } = await params;
  if (!isRegionEnabled(region)) notFound();

  const albionRegion = region as AlbionRegion;
  const resolved = await resolveGuildAlbionId(albionRegion, guildName);
  if (!resolved) notFound();
  if ("pending" in resolved) {
    const jobState = await getEntityResolveJobStateForPending(
      albionRegion,
      resolved.entityType,
      resolved.entityName
    );
    return (
      <ProfileFetchPending
        entityType="guild"
        region={albionRegion}
        entityName={resolved.entityName}
        jobState={jobState}
      />
    );
  }
  if (resolved.redirectTo) permanentRedirect(resolved.redirectTo);

  const { albionId } = resolved;
  const profile = await loadGuildProfile(albionRegion, albionId);

  if (!profile) {
    await ensureGuildSyncQueued(albionRegion, albionId, { immediate: true });
    const syncJobState = await getGuildSyncJobState(albionRegion, albionId);
    return (
      <ProfileFetchPending
        entityType="guild"
        region={albionRegion}
        entityId={albionId}
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
  const syncJobState = await getGuildSyncJobState(albionRegion, albionId);
  const isIngesting = isGuildDataIngesting({
    lastSyncedAt,
    historyLastSyncedAt,
    battlesLastSyncedAt,
    syncJobState,
  });
  const canonicalPath = entityPath("guild", albionRegion, header.name);

  return (
    <div className="space-y-6">
      <JsonLd
        data={organizationJsonLd({
          name: header.name,
          url: entityCanonical("guild", albionRegion, header.name),
          regionLabel: regionLabel(albionRegion),
          memberCount: header.memberCount,
          description: `${header.name} guild on ${regionLabel(albionRegion)} · ${formatFame(header.killFame)} kill fame`,
        })}
      />
      <BackLink />
      {isIngesting && <IngestingBanner entityType="guild" />}

      <GuildHeader guild={header} sharePath={canonicalPath} />

      <GuildProfileNav />

      <div id="kills" className="scroll-mt-28">
        <Suspense fallback={<GuildTopKillsFallback />}>
          <GuildTopKillsSection
            region={albionRegion}
            guildId={albionId}
            historyLastSyncedAt={historyLastSyncedAt}
          />
        </Suspense>
      </div>

      <div id="rivals" className="scroll-mt-28">
        <Suspense fallback={<GuildRivalsFallback />}>
          <GuildRivalsPanel
            region={albionRegion}
            guildId={albionId}
            guildName={header.name}
          />
        </Suspense>
      </div>

      <div id="battles" className="scroll-mt-28">
        <Suspense fallback={<GuildBattlesSectionsFallback />}>
          <GuildBattlesSections region={albionRegion} guildId={albionId} />
        </Suspense>
      </div>
    </div>
  );
}
