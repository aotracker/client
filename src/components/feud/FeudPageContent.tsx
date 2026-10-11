import type { ReactNode } from "react";
import type { AlbionRegion } from "@/lib/albion/types";
import {
  getCachedAllianceFeudBundle,
  getCachedGuildFeudBundle,
} from "@/lib/feud/cached-feud-data";
import type { FeudDaysFilter } from "@/lib/feud/params";
import { FeudScoreboard } from "@/components/feud/FeudScoreboard";
import { FeudTopPlayersSection } from "@/components/feud/FeudTopPlayersSection";
import { FeudKillsTabs } from "@/components/feud/FeudKillsTabs";
import { FeudProfileNav } from "@/components/feud/FeudProfileNav";
import {
  AllianceFeudGuildLinks,
  GuildFeudAllianceLink,
} from "@/components/feud/FeudCrossLinks";

type FeudKind = "guild" | "alliance";

interface FeudAllianceLinkContext {
  allianceAId: string;
  allianceBId: string;
  allianceAName: string;
  allianceBName: string;
  allianceATag?: string | null;
  allianceBTag?: string | null;
}

interface FeudPageContentProps {
  kind: FeudKind;
  region: AlbionRegion;
  nameA: string;
  nameB: string;
  tagA?: string | null;
  tagB?: string | null;
  idA: string;
  idB: string;
  guildAId?: string | null;
  guildBId?: string | null;
  days: FeudDaysFilter;
  offset: number;
  header: ReactNode;
  allianceLink?: FeudAllianceLinkContext | null;
}

async function loadGuildFeudData(props: FeudPageContentProps) {
  return getCachedGuildFeudBundle(
    props.region,
    props.nameA,
    props.nameB,
    props.days,
    props.guildAId,
    props.guildBId,
    props.offset
  );
}

async function loadAllianceFeudData(props: FeudPageContentProps) {
  return getCachedAllianceFeudBundle(
    props.region,
    props.idA,
    props.idB,
    props.days,
    props.offset
  );
}

export async function FeudPageContent(props: FeudPageContentProps) {
  const data =
    props.kind === "guild"
      ? await loadGuildFeudData(props)
      : await loadAllianceFeudData(props);

  const hasTopPlayers =
    data.topPlayers.aKillers.length > 0 ||
    data.topPlayers.bKillers.length > 0 ||
    data.topPlayers.aVictims.length > 0 ||
    data.topPlayers.bVictims.length > 0;
  const hasGuildFeuds =
    props.kind === "alliance" && data.guildPairs.length > 0;

  return (
    <div className="space-y-8">
      {props.header}
      {props.allianceLink && (
        <GuildFeudAllianceLink region={props.region} {...props.allianceLink} />
      )}
      <FeudProfileNav
        showTopPlayers={hasTopPlayers}
        showGuildFeuds={hasGuildFeuds}
      />
      <div id="scoreboard" className="scroll-mt-28">
        <FeudScoreboard
          nameA={props.nameA}
          nameB={props.nameB}
          tagA={props.tagA}
          tagB={props.tagB}
          stats={data.stats}
          contentMix={data.contentMix}
          days={props.days}
        />
      </div>
      {hasTopPlayers && (
        <div id="top-players" className="scroll-mt-28">
          <FeudTopPlayersSection
            region={props.region}
            nameA={props.nameA}
            nameB={props.nameB}
            tagA={props.tagA}
            tagB={props.tagB}
            players={data.topPlayers}
          />
        </div>
      )}
      {hasGuildFeuds && (
        <div id="guild-feuds" className="scroll-mt-28">
          <AllianceFeudGuildLinks
            region={props.region}
            pairs={data.guildPairs}
          />
        </div>
      )}
      <div id="kills" className="scroll-mt-28">
        <FeudKillsTabs
          days={props.days}
          topKills={data.topKills}
          recentPage={data.killsPage}
        />
      </div>
    </div>
  );
}

export function guildFeudAllianceLink(
  guildA: {
    allianceId?: string | null;
    allianceName?: string | null;
    allianceTag?: string | null;
  },
  guildB: {
    allianceId?: string | null;
    allianceName?: string | null;
    allianceTag?: string | null;
  }
): FeudAllianceLinkContext | null {
  const allianceAId = guildA.allianceId?.trim();
  const allianceBId = guildB.allianceId?.trim();
  if (!allianceAId || !allianceBId || allianceAId === allianceBId) {
    return null;
  }

  return {
    allianceAId,
    allianceBId,
    allianceAName: guildA.allianceName?.trim() || allianceAId,
    allianceBName: guildB.allianceName?.trim() || allianceBId,
    allianceATag: guildA.allianceTag?.trim() || null,
    allianceBTag: guildB.allianceTag?.trim() || null,
  };
}
