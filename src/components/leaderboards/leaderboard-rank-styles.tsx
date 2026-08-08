import { cn } from "@/lib/utils";
import {
  statVariantClass,
  type StatVariant,
} from "@/components/StatValue";

export interface LeaderboardPodiumEntry {
  rank: number;
  name: string;
  href: string;
  subtitle?: string;
  stat: string;
  statLabel?: string;
  statVariant?: StatVariant;
}

const TOP_THREE_ROW =
  "border-l-2 border-l-primary/60 bg-primary/[0.08]";
const TOP_THREE_BADGE = "font-bold text-primary";
const TOP_THREE_PODIUM =
  "border-primary/35 bg-primary/[0.09] shadow-sm ring-1 ring-inset ring-primary/10";
const TOP_THREE_PODIUM_BADGE =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary";
const TOP_THREE_KILL_CARD =
  "border-primary/40 bg-primary/[0.07] shadow-sm hover:border-primary/55";

function isTopThree(rank: number): boolean {
  return rank >= 1 && rank <= 3;
}

export function leaderboardRankHighlightClassName(rank: number): string {
  return isTopThree(rank) ? TOP_THREE_ROW : "";
}

export function leaderboardRankBadgeClassName(rank: number): string {
  return isTopThree(rank) ? TOP_THREE_BADGE : "text-muted-foreground";
}

export function leaderboardPodiumCardClassName(rank: number): string {
  return isTopThree(rank) ? TOP_THREE_PODIUM : "border-border/60 bg-card/40";
}

export function leaderboardKillCardHighlightClassName(rank: number): string {
  return isTopThree(rank) ? TOP_THREE_KILL_CARD : "";
}

export function LeaderboardRankBadge({
  rank,
  variant = "list",
  className,
}: {
  rank: number;
  variant?: "list" | "podium";
  className?: string;
}) {
  if (isTopThree(rank) && variant === "podium") {
    return (
      <span className={cn(TOP_THREE_PODIUM_BADGE, className)} aria-hidden>
        {rank}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "w-6 shrink-0 text-center text-xs font-semibold tabular-nums xl:w-auto",
        leaderboardRankBadgeClassName(rank),
        className
      )}
    >
      {rank}
    </span>
  );
}
