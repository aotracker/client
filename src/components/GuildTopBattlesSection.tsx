import { getGuildByAlbionId } from "@/lib/db/queries";
import {
  guildBattleListNeedsRefresh,
  hasBattleKillFame,
  isMultiMemberGuildBattle,
  unwrapGuildBattleListCache,
} from "@/lib/albion/battles";
import type { AlbionRegion, GuildBattleSummary } from "@/lib/albion/types";
import { EntityBattlesTabs } from "@/components/EntityBattlesTabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface GuildBattlesSectionsProps {
  region: AlbionRegion;
  guildId: string;
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
    }))
    .filter(isMultiMemberGuildBattle);
}

/** Recent + Top Battles from DB cache; background worker refreshes stale data. */
export async function GuildBattlesSections({
  region,
  guildId,
}: GuildBattlesSectionsProps) {
  const guild = await getGuildByAlbionId(region, guildId);
  const topBattles = parseBattles(
    unwrapGuildBattleListCache(guild?.topBattlesPayload)
  );
  const recentBattles = parseBattles(
    unwrapGuildBattleListCache(guild?.recentBattlesPayload)
  );

  const needRecentSync = guildBattleListNeedsRefresh(
    guild?.recentBattlesPayload,
    guild?.topBattlesPayload,
    guild?.battlesLastSyncedAt
  );
  const needTopSync = guildBattleListNeedsRefresh(
    guild?.topBattlesPayload,
    guild?.recentBattlesPayload,
    guild?.battlesLastSyncedAt
  );

  return (
    <EntityBattlesTabs
      region={region}
      recentBattles={recentBattles}
      topBattles={topBattles}
      recentDescription="Most recent battles with guild participation in the past 7 days"
      topDescription="Highest kill fame battles with guild participation in the past 7 days"
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

export function GuildBattlesSectionsFallback() {
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

/** @deprecated Prefer GuildBattlesSections */
export const GuildTopBattlesSection = GuildBattlesSections;
/** @deprecated Prefer GuildBattlesSectionsFallback */
export const GuildTopBattlesFallback = GuildBattlesSectionsFallback;
