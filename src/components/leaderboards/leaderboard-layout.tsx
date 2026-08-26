import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { leaderboardRankHighlightClassName } from "@/components/leaderboards/leaderboard-rank-styles";
import { cn } from "@/lib/utils";

export const KILLER_LEADERBOARD_GRID =
  "xl:grid-cols-[2.5rem_minmax(0,1.5fr)_5.5rem_minmax(0,1fr)_4.5rem]";

export const GUILD_LEADERBOARD_GRID =
  "xl:grid-cols-[2.5rem_minmax(0,1.5fr)_5.5rem_5.5rem_4rem]";

export const FAME_LEADERBOARD_GRID =
  "xl:grid-cols-[2.5rem_minmax(0,1.5fr)_5.5rem_minmax(0,1fr)_5rem_4rem]";

export const LEADERBOARD_PODIUM_COUNT = 3;

/** Rows already shown in the podium strip (wide leaderboard layout). */
export function excludePodiumEntries<T extends { rank: number }>(
  items: T[]
): T[] {
  return items.filter((item) => item.rank > LEADERBOARD_PODIUM_COUNT);
}

export function splitIntoColumns<T>(items: T[], columnCount = 2): T[][] {
  const columnSize = Math.ceil(items.length / columnCount);
  return Array.from({ length: columnCount }, (_, index) =>
    items.slice(index * columnSize, (index + 1) * columnSize)
  );
}

interface LeaderboardColumnHeader {
  label: string;
  align?: "right";
}

export function LeaderboardTableHeader({
  gridClassName,
  columns,
}: {
  gridClassName: string;
  columns: LeaderboardColumnHeader[];
}) {
  return (
    <div
      className={cn(
        "hidden gap-x-3 border-b border-border/60 bg-muted/20 px-3 py-2 text-label xl:grid",
        gridClassName
      )}
      aria-hidden
    >
      {columns.map((column) => (
        <span
          key={column.label}
          className={cn(
            "min-w-0 truncate",
            column.align === "right" ? "text-right" : undefined
          )}
        >
          {column.label}
        </span>
      ))}
    </div>
  );
}

export function LeaderboardTableShell({ children }: { children: ReactNode }) {
  return <div className="xl:grid xl:grid-cols-2 xl:gap-4">{children}</div>;
}

export function LeaderboardWideColumn({
  gridClassName,
  headerColumns,
  children,
}: {
  gridClassName: string;
  headerColumns: LeaderboardColumnHeader[];
  children: ReactNode;
}) {
  return (
    <LeaderboardPanel>
      <LeaderboardTableHeader
        gridClassName={gridClassName}
        columns={headerColumns}
      />
      {children}
    </LeaderboardPanel>
  );
}

export function LeaderboardPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>{children}</Card>
  );
}

export function leaderboardRowClassName(
  wide: boolean,
  gridClassName: string,
  rank?: number
): string {
  return cn(
    "px-3 py-2.5",
    wide
      ? cn(
          "flex items-center gap-3 xl:grid xl:items-center xl:gap-x-3",
          gridClassName
        )
      : "flex items-center gap-3",
    rank != null && rank <= 3
      ? leaderboardRankHighlightClassName(rank)
      : undefined
  );
}
