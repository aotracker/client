import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Swords } from "lucide-react";
import type {
  AlbionBattle,
  AlbionRegion,
} from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import { getCachedBattle } from "@/lib/db/battle-cache";
import {
  ensureBattleDetailQueued,
  getBattleSyncJobInfo,
} from "@/lib/jobs/queue";
import { BackLink } from "@/components/BackLink";
import { BattleDetailPending } from "@/components/BattleDetailPending";
import { BattleAlliancesList } from "@/components/BattleAlliancesList";
import { BattleGuildsList } from "@/components/BattleGuildsList";
import { BattlePlayersList } from "@/components/BattlePlayersList";
import { EntityStatStrip } from "@/components/EntityStatStrip";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFame, regionLabel } from "@/lib/utils";
import { withBattlePlayerWeaponTooltips } from "@/lib/items/battle-player-tooltips";
import { getLocale } from "next-intl/server";
import { RelativeTime } from "@/components/RelativeTime";
import { battleJsonLd, JsonLd } from "@/components/JsonLd";
import {
  battleSeoDescription,
  battleSeoTitle,
  buildPageMetadata,
  entityCanonical,
  entityPath,
  notFoundMetadata,
  pendingEntityMetadata,
} from "@/lib/seo";

interface PageProps {
  params: Promise<{ region: string; battleId: string }>;
}

const loadCachedBattle = cache(async function loadCachedBattle(
  region: AlbionRegion,
  battleId: number
) {
  return getCachedBattle(region, battleId);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region, battleId } = await params;
  if (!isRegionEnabled(region)) return notFoundMetadata();
  const albionRegion = region as AlbionRegion;
  const parsedBattleId = parseInt(battleId, 10);
  const path = entityPath("battle", region, parsedBattleId);
  if (Number.isNaN(parsedBattleId)) return notFoundMetadata();

  const battle = await loadCachedBattle(albionRegion, parsedBattleId);
  if (!battle) return pendingEntityMetadata("Battle", path);

  const id = battle.id ?? parsedBattleId;
  const totalPlayers =
    battle.totalPlayers ??
    (battle.players ? Object.keys(battle.players).length : null);

  return buildPageMetadata({
    title: battleSeoTitle(id, albionRegion),
    description: battleSeoDescription({
      region: albionRegion,
      battleId: id,
      totalFame: battle.totalFame,
      totalKills: battle.totalKills,
      totalPlayers,
      startTime: battle.startTime,
      endTime: battle.endTime,
    }),
    canonicalPath: path,
  });
}

export default async function BattleDetailPage({ params }: PageProps) {
  const { region, battleId } = await params;
  if (!isRegionEnabled(region)) notFound();
  const albionRegion = region as AlbionRegion;
  const parsedBattleId = parseInt(battleId, 10);

  if (Number.isNaN(parsedBattleId)) notFound();

  const battle = await loadCachedBattle(albionRegion, parsedBattleId);
  if (!battle) {
    const jobInfo = await getBattleSyncJobInfo(albionRegion, parsedBattleId);
    if (!jobInfo.detailUnavailable) {
      await ensureBattleDetailQueued(albionRegion, parsedBattleId, {
        immediate: true,
      });
    }
    const freshInfo = jobInfo.detailUnavailable
      ? jobInfo
      : await getBattleSyncJobInfo(albionRegion, parsedBattleId);
    return (
      <BattleDetailPending
        region={albionRegion}
        battleId={parsedBattleId}
        jobState={freshInfo.state}
        jobInfo={freshInfo}
      />
    );
  }

  const battleName = `Albion Battle #${battle.id ?? parsedBattleId}`;
  const battleDescription = `${formatFame(battle.totalFame)} fame · ${battle.totalKills ?? 0} kills · ${regionLabel(albionRegion)}`;

  return (
    <div className="space-y-6">
      <JsonLd
        data={battleJsonLd({
          name: battleName,
          url: entityCanonical("battle", albionRegion, parsedBattleId),
          startDate: battle.startTime,
          endDate: battle.endTime,
          description: battleDescription,
          regionLabel: regionLabel(albionRegion),
        })}
      />
      <BackLink />

      <BattleSummaryCard
        battle={battle}
        battleId={parsedBattleId}
        region={albionRegion}
      />

      <Suspense fallback={<BattleDetailsFallback />}>
        <BattleDetails region={albionRegion} battleId={parsedBattleId} />
      </Suspense>
    </div>
  );
}

function BattleSummaryCard({
  battle,
  battleId,
  region,
}: {
  battle: AlbionBattle;
  battleId: number;
  region: AlbionRegion;
}) {
  const startTime = battle.startTime ? new Date(battle.startTime) : null;
  const endTime = battle.endTime ? new Date(battle.endTime) : null;
  const totalPlayers =
    battle.totalPlayers ?? (battle.players ? Object.keys(battle.players).length : null);
  const durationMinutes =
    startTime && endTime && !Number.isNaN(startTime.getTime()) && !Number.isNaN(endTime.getTime())
      ? Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60_000))
      : null;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted/20">
            <Swords className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold leading-none tracking-tight">
              Albion Battle #{battle.id ?? battleId}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {regionLabel(region)}
              {startTime && (
                <>
                  {" "}
                  · Started <RelativeTime date={startTime} />
                </>
              )}
            </p>
          </div>
          </div>
          <ShareLinkButton path={`/battle/${region}/${battleId}`} />
        </div>

        <EntityStatStrip
          stats={[
            {
              label: "Total Fame",
              mobileLabel: "Fame",
              value: formatFame(battle.totalFame),
              variant: "fame",
            },
            {
              label: "Total Kills",
              mobileLabel: "Kills",
              value: battle.totalKills?.toLocaleString() ?? "—",
              variant: "kill",
            },
            {
              label: "Players",
              value: totalPlayers?.toLocaleString() ?? "—",
              variant: "neutral",
            },
          ]}
        />

        {(startTime || endTime) && (
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {startTime && (
                <span>
                  Started: <RelativeTime date={startTime} />
                </span>
              )}
              {endTime && (
                <span>
                  Ended: <RelativeTime date={endTime} />
                </span>
              )}
            </div>
            {durationMinutes != null && (
              <p>
                Fight time: {durationMinutes.toLocaleString()}{" "}
                {durationMinutes === 1 ? "minute" : "minutes"}
              </p>
            )}
          </div>
        )}
      </CardHeader>
    </Card>
  );
}

async function BattleDetails({
  region,
  battleId,
}: {
  region: AlbionRegion;
  battleId: number;
}) {
  const { getCachedBattleDetail } = await import("@/lib/db/battle-cache");
  const cached = await getCachedBattleDetail(region, battleId);

  if (!cached) {
    // Stub / evicted detail — rehydrate via worker (don't block the page on Albion).
    await ensureBattleDetailQueued(region, battleId, { immediate: true });
    const jobInfo = await getBattleSyncJobInfo(region, battleId);
    return (
      <BattleDetailPending
        region={region}
        battleId={battleId}
        jobState={jobInfo.state}
        jobInfo={jobInfo}
        embedded
      />
    );
  }

  const { alliances, guilds, players } = cached;
  const locale = await getLocale();
  const playersWithTooltips = withBattlePlayerWeaponTooltips(players, locale);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <BattleAlliancesList region={region} alliances={alliances} />
        <BattleGuildsList region={region} guilds={guilds} />
      </div>
      <BattlePlayersList region={region} players={playersWithTooltips} />
    </>
  );
}

function BattleDetailsFallback() {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Alliances</CardTitle>
            </CardHeader>
            <CardContent className="py-6 text-center text-muted-foreground">
              Loading alliance stats…
            </CardContent>
          </Card>
        </section>
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Guilds</CardTitle>
            </CardHeader>
            <CardContent className="py-6 text-center text-muted-foreground">
              Loading guild stats…
            </CardContent>
          </Card>
        </section>
      </div>
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Players</CardTitle>
          </CardHeader>
          <CardContent className="py-6 text-center text-muted-foreground">
            Loading player stats and gear…
          </CardContent>
        </Card>
      </section>
    </>
  );
}
