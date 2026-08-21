import { getTranslations } from "next-intl/server";
import { formatFame } from "@/lib/utils";
import type { FeudStats } from "@/lib/db/queries";
import { FeudContentMix } from "@/components/feud/FeudContentMix";
import { FeudDisplayName } from "@/components/feud/FeudDisplayName";
import type { PlayerContentMixEntry } from "@/lib/db/queries";
import type { FeudDaysFilter } from "@/lib/feud/params";
import { FeudFilters } from "@/components/feud/FeudFilters";

interface FeudScoreboardProps {
  nameA: string;
  nameB: string;
  tagA?: string | null;
  tagB?: string | null;
  stats: FeudStats;
  contentMix: PlayerContentMixEntry[];
  days: FeudDaysFilter;
}

export async function FeudScoreboard({
  nameA,
  nameB,
  tagA,
  tagB,
  stats,
  contentMix,
  days,
}: FeudScoreboardProps) {
  const t = await getTranslations("Feud.scoreboard");
  const totalKills = stats.aKillsB + stats.bKillsA;
  const aShare = totalKills > 0 ? (stats.aKillsB / totalKills) * 100 : 50;
  const bShare = totalKills > 0 ? 100 - aShare : 50;

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-border/60 bg-card/40 p-4 sm:p-6">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="space-y-1 text-center sm:text-left">
            <p className="truncate text-sm font-medium text-muted-foreground">
              <FeudDisplayName name={nameA} tag={tagA} />
            </p>
            <p className="font-display text-4xl font-semibold tabular-nums tracking-tight text-foreground">
              {stats.aKillsB.toLocaleString()}
            </p>
            <p className="text-sm text-stat-fame">
              {formatFame(stats.aFameOnB)} {t("fame")}
            </p>
          </div>

          <div className="hidden text-center sm:block">
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {t("vs")}
            </span>
          </div>

          <div className="space-y-1 text-center sm:text-right">
            <p className="truncate text-sm font-medium text-muted-foreground">
              <FeudDisplayName name={nameB} tag={tagB} />
            </p>
            <p className="font-display text-4xl font-semibold tabular-nums tracking-tight text-foreground">
              {stats.bKillsA.toLocaleString()}
            </p>
            <p className="text-sm text-stat-fame">
              {formatFame(stats.bFameOnA)} {t("fame")}
            </p>
          </div>
        </div>

        {totalKills > 0 && (
          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(aShare)}%</span>
              <span>{Math.round(bShare)}%</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-stat-kill transition-all"
                style={{ width: `${aShare}%` }}
              />
              <div
                className="bg-stat-death/80 transition-all"
                style={{ width: `${bShare}%` }}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {t("totalKills", { count: totalKills })}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FeudContentMix contentMix={contentMix} />
        <FeudFilters days={days} />
      </div>
    </section>
  );
}
