import Link from "next/link";
import type { LeaderboardPodiumEntry } from "@/components/leaderboards/leaderboard-rank-styles";
import {
  LeaderboardRankBadge,
  leaderboardPodiumCardClassName,
} from "@/components/leaderboards/leaderboard-rank-styles";
import { statVariantClass } from "@/components/StatValue";
import { cn } from "@/lib/utils";

interface LeaderboardTopThreeProps {
  entries: LeaderboardPodiumEntry[];
}

export function LeaderboardTopThree({ entries }: LeaderboardTopThreeProps) {
  const topThree = entries.slice(0, 3);
  if (topThree.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {topThree.map((entry) => (
        <Link
          key={entry.rank}
          href={entry.href}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors hover:bg-primary/[0.12]",
            leaderboardPodiumCardClassName(entry.rank),
            entry.rank === 1 && "sm:py-3.5"
          )}
        >
          <LeaderboardRankBadge rank={entry.rank} variant="podium" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{entry.name}</p>
            {entry.subtitle ? (
              <p className="truncate text-xs text-muted-foreground">
                {entry.subtitle}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                statVariantClass(entry.statVariant ?? "neutral")
              )}
            >
              {entry.stat}
            </p>
            {entry.statLabel ? (
              <p className="text-xs text-muted-foreground">{entry.statLabel}</p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
