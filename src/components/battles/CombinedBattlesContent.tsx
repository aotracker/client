import { Link } from "@/i18n/navigation";
import {
  mergeBattleDetails,
  type BattleDetailData,
} from "@/lib/albion/battles";
import type { AlbionBattle, AlbionRegion } from "@/lib/albion/types";
import { getCachedBattleDetail } from "@/lib/db/battle-cache";
import { ensureBattleDetailQueued } from "@/lib/jobs/queue";
import { BattleAlliancesList } from "@/components/BattleAlliancesList";
import { BattleGuildsList } from "@/components/BattleGuildsList";
import { BattlePlayersList } from "@/components/BattlePlayersList";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { StatValue } from "@/components/StatValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFame, regionLabel } from "@/lib/utils";
import { withBattlePlayerWeaponTooltips } from "@/lib/items/battle-player-tooltips";
import { getLocale } from "next-intl/server";
import { RelativeTime } from "@/components/RelativeTime";
import { Swords } from "lucide-react";
import { notFound } from "next/navigation";
import { MAX_COMBINED_BATTLES } from "@/lib/battles-constants";

export type ParsedBattleRef = { region: AlbionRegion; battleId: number };

export async function CombinedBattlesContent({
  refs,
}: {
  refs: ParsedBattleRef[];
}) {
  const region = refs[0]!.region;

  const loaded = await Promise.all(
    refs.map(async (ref) => {
      const cached = await getCachedBattleDetail(ref.region, ref.battleId);
      if (!cached) {
        await ensureBattleDetailQueued(ref.region, ref.battleId, {
          immediate: true,
        });
      }
      return cached;
    })
  );

  const details: BattleDetailData[] = [];
  const missing: ParsedBattleRef[] = [];

  for (let i = 0; i < refs.length; i++) {
    const data = loaded[i];
    const ref = refs[i]!;
    if (!data) {
      missing.push(ref);
      continue;
    }
    details.push(data);
  }

  if (details.length < 2) notFound();

  const merged = mergeBattleDetails(details);
  if (!merged) notFound();

  const { battle, alliances, guilds, players } = merged;
  const locale = await getLocale();
  const playersWithTooltips = withBattlePlayerWeaponTooltips(players, locale);

  return (
    <>
      <CombinedSummaryCard
        battle={battle}
        battleCount={details.length}
        region={region}
        sharePath={`/battles/combined?ids=${refs
          .map((r) => `${r.region}:${r.battleId}`)
          .join(",")}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Included battles</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {details.map((detail) => {
              const id = detail.battle.id ?? detail.battle.albionId;
              if (id == null) return null;
              return (
                <li key={`${region}-${id}`}>
                  <Link
                    href={`/battle/${region}/${id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    Albion Battle #{id}
                  </Link>
                  {detail.battle.startTime && (
                    <span className="ml-2 text-muted-foreground">
                      ·{" "}
                      <RelativeTime date={new Date(detail.battle.startTime)} />
                    </span>
                  )}
                  <span className="ml-2 text-muted-foreground">
                    · {formatFame(detail.battle.totalFame)} fame
                  </span>
                </li>
              );
            })}
          </ul>
          {missing.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {missing.length} selected battle
              {missing.length === 1 ? " was" : "s were"} unavailable and omitted.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <BattleAlliancesList region={region} alliances={alliances} />
        <BattleGuildsList region={region} guilds={guilds} />
      </div>
      <BattlePlayersList region={region} players={playersWithTooltips} />
    </>
  );
}

function CombinedSummaryCard({
  battle,
  battleCount,
  region,
  sharePath,
}: {
  battle: AlbionBattle;
  battleCount: number;
  region: AlbionRegion;
  sharePath: string;
}) {
  const startTime = battle.startTime ? new Date(battle.startTime) : null;
  const endTime = battle.endTime ? new Date(battle.endTime) : null;
  const totalPlayers =
    battle.totalPlayers ??
    (battle.players ? Object.keys(battle.players).length : null);
  const durationMinutes =
    startTime &&
    endTime &&
    !Number.isNaN(startTime.getTime()) &&
    !Number.isNaN(endTime.getTime())
      ? Math.max(
          0,
          Math.round((endTime.getTime() - startTime.getTime()) / 60_000)
        )
      : null;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border/40 bg-muted/20">
            <Swords className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-semibold leading-none tracking-tight">
                  Combined Battles ({battleCount})
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {regionLabel(region)}
                  {startTime && (
                    <>
                      {" "}
                      · Earliest start <RelativeTime date={startTime} />
                    </>
                  )}
                </p>
              </div>
              <ShareLinkButton path={sharePath} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <StatValue
            label="Total Fame"
            value={formatFame(battle.totalFame)}
            variant="fame"
            size="header"
          />
          <StatValue
            label="Total Kills"
            value={battle.totalKills?.toLocaleString() ?? "—"}
            variant="kill"
            size="header"
          />
          <StatValue
            label="Players"
            value={totalPlayers?.toLocaleString() ?? "—"}
            variant="neutral"
            size="header"
          />
        </div>

        {(startTime || endTime) && (
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {startTime && (
                <span>
                  Earliest start: <RelativeTime date={startTime} />
                </span>
              )}
              {endTime && (
                <span>
                  Latest end: <RelativeTime date={endTime} />
                </span>
              )}
            </div>
            {durationMinutes != null && (
              <p>
                Span: {durationMinutes.toLocaleString()}{" "}
                {durationMinutes === 1 ? "minute" : "minutes"}
              </p>
            )}
          </div>
        )}
      </CardHeader>
    </Card>
  );
}

export function CombinedBattlesContentFallback({
  battleCount,
}: {
  battleCount: number;
}) {
  return (
    <>
      <Card className="border-border/60">
        <CardHeader className="space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-7 w-56 max-w-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardHeader>
      </Card>
      <Card className="border-border/60">
        <CardContent className="space-y-3 py-4">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: Math.min(battleCount, MAX_COMBINED_BATTLES) }).map(
            (_, i) => (
              <Skeleton key={i} className="h-4 w-64 max-w-full" />
            )
          )}
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </>
  );
}
