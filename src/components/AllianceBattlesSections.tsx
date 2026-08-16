import {
  getAllianceBattleParticipationByAlbionIds,
  getAllianceByAlbionId,
  type AllianceBattleHydration,
} from "@/lib/db/queries";
import {
  guildBattleListNeedsRefresh,
  hasBattleKillFame,
  unwrapGuildBattleListCache,
} from "@/lib/albion/battles";
import type { AlbionRegion, GuildBattleSummary } from "@/lib/albion/types";
import { EntityBattlesTabs } from "@/components/EntityBattlesTabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AllianceBattlesSectionsProps {
  region: AlbionRegion;
  allianceId: string;
}

function parseBattles(payload: unknown): GuildBattleSummary[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter(
      (item): item is GuildBattleSummary =>
        item != null &&
        typeof item === "object" &&
        typeof (item as GuildBattleSummary).id === "number" &&
        hasBattleKillFame(item as GuildBattleSummary)
    )
    .map((item) => ({
      ...item,
      guilds: Array.isArray(item.guilds) ? item.guilds : [],
      guildCount:
        typeof item.guildCount === "number"
          ? item.guildCount
          : Array.isArray(item.guilds)
            ? item.guilds.length
            : 0,
      guildMembers: typeof item.guildMembers === "number" ? item.guildMembers : 0,
      guildKillFame: item.guildKillFame ?? null,
      guildKills: item.guildKills ?? null,
      guildDeaths: item.guildDeaths ?? null,
      alliances: Array.isArray(item.alliances) ? item.alliances : [],
      allianceCount:
        typeof item.allianceCount === "number"
          ? item.allianceCount
          : Array.isArray(item.alliances)
            ? item.alliances.length
            : 0,
    }));
}

function applyAllianceParticipation(
  battles: GuildBattleSummary[],
  known: Map<number, AllianceBattleHydration>
): GuildBattleSummary[] {
  return battles.map((battle) => {
    const participation = known.get(battle.id);
    if (!participation) return battle;
    return {
      ...battle,
      guildKillFame:
        battle.guildKillFame != null && battle.guildKillFame > 0
          ? battle.guildKillFame
          : (participation.killFame ?? battle.guildKillFame),
      guildKills:
        battle.guildKills != null && battle.guildKills > 0
          ? battle.guildKills
          : (participation.kills ?? battle.guildKills),
      guildDeaths:
        battle.guildDeaths != null && battle.guildDeaths > 0
          ? battle.guildDeaths
          : (participation.deaths ?? battle.guildDeaths),
      guildMembers:
        battle.guildMembers > 0 ? battle.guildMembers : participation.members,
      alliances:
        battle.alliances && battle.alliances.length > 0
          ? battle.alliances
          : participation.alliances,
      allianceCount:
        battle.allianceCount && battle.allianceCount > 0
          ? battle.allianceCount
          : participation.allianceCount,
    };
  });
}

export async function AllianceBattlesSections({
  region,
  allianceId,
}: AllianceBattlesSectionsProps) {
  const alliance = await getAllianceByAlbionId(region, allianceId);
  const topBattles = parseBattles(
    unwrapGuildBattleListCache(alliance?.topBattlesPayload)
  );
  const recentBattles = parseBattles(
    unwrapGuildBattleListCache(alliance?.recentBattlesPayload)
  );
  const knownParticipation = await getAllianceBattleParticipationByAlbionIds(
    region,
    allianceId,
    [
      ...topBattles.map((battle) => battle.id),
      ...recentBattles.map((battle) => battle.id),
    ]
  );

  const needRecentSync = guildBattleListNeedsRefresh(
    alliance?.recentBattlesPayload,
    alliance?.topBattlesPayload,
    alliance?.battlesLastSyncedAt,
    { requireAlliancePreview: true }
  );
  const needTopSync = guildBattleListNeedsRefresh(
    alliance?.topBattlesPayload,
    alliance?.recentBattlesPayload,
    alliance?.battlesLastSyncedAt,
    { requireAlliancePreview: true }
  );

  return (
    <EntityBattlesTabs
      region={region}
      recentBattles={applyAllianceParticipation(
        recentBattles,
        knownParticipation
      )}
      topBattles={applyAllianceParticipation(topBattles, knownParticipation)}
      recentDescription="Most recent battles with alliance participation in the past 7 days"
      topDescription="Highest kill fame battles with alliance participation in the past 7 days"
      recentLoadingLabel={
        needRecentSync && recentBattles.length === 0
          ? "Loading battles from Albion Online…"
          : null
      }
      topLoadingLabel={
        needTopSync && topBattles.length === 0
          ? "Loading battles from Albion Online…"
          : null
      }
      recentEmptyLabel="No recent battles this week"
      topEmptyLabel="No top battles this week"
      showGuildStats
    />
  );
}

export function AllianceBattlesSectionsFallback() {
  return (
    <section className="space-y-3" aria-busy="true" aria-label="Loading battles">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Loading battles…
        </CardContent>
      </Card>
    </section>
  );
}
