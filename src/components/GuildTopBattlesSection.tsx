import { getGuildByAlbionId } from "@/lib/db/queries";
import { ensureGuildSyncQueued } from "@/lib/jobs/queue";
import {
  guildBattleListNeedsRefresh,
  hasBattleKillFame,
  unwrapGuildBattleListCache,
} from "@/lib/albion/battles";
import type { AlbionRegion, GuildBattleSummary } from "@/lib/albion/types";
import { BattleCard } from "@/components/BattleCard";
import { Card, CardContent } from "@/components/ui/card";
import { after } from "next/server";

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
    }));
}

function GuildBattlesList({
  title,
  description,
  battles,
  region,
  loadingLabel,
  emptyLabel,
}: {
  title: string;
  description: string;
  battles: GuildBattleSummary[];
  region: AlbionRegion;
  loadingLabel: string | null;
  emptyLabel: string;
}) {
  return (
    <section className="min-w-0">
      <h2 className="mb-3 text-lg font-semibold">
        {title} ({battles.length})
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      <div className="min-w-0 space-y-3">
        {battles.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              {loadingLabel ?? emptyLabel}
            </CardContent>
          </Card>
        ) : (
          battles.map((battle) => (
            <BattleCard
              key={`${title}-${battle.id}`}
              battle={battle}
              region={region}
              showGuildStats
              guilds={battle.guilds}
              guildCount={battle.guildCount}
            />
          ))
        )}
      </div>
    </section>
  );
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

  if (needRecentSync || needTopSync) {
    after(() => ensureGuildSyncQueued(region, guildId));
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <GuildBattlesList
        title="Recent Battles"
        description="Most recent battles with guild participation in the past 7 days"
        battles={recentBattles}
        region={region}
        loadingLabel={
          needRecentSync && recentBattles.length === 0
            ? "Loading battles from Albion Online…"
            : null
        }
        emptyLabel="No recent battles this week"
      />
      <GuildBattlesList
        title="Top Battles"
        description="Highest kill fame battles with guild participation in the past 7 days"
        battles={topBattles}
        region={region}
        loadingLabel={
          needTopSync && topBattles.length === 0
            ? "Loading battles from Albion Online…"
            : null
        }
        emptyLabel="No top battles this week"
      />
    </div>
  );
}

export function GuildBattlesSectionsFallback() {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Battles</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Most recent battles with guild participation in the past 7 days
        </p>
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            Loading recent battles…
          </CardContent>
        </Card>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Top Battles</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Highest kill fame battles with guild participation in the past 7 days
        </p>
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            Loading top battles…
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

/** @deprecated Prefer GuildBattlesSections */
export const GuildTopBattlesSection = GuildBattlesSections;
/** @deprecated Prefer GuildBattlesSectionsFallback */
export const GuildTopBattlesFallback = GuildBattlesSectionsFallback;
