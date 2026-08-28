import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/EmptyState";
import { formatFame, regionLabel } from "@/lib/utils";
import {
  GUILD_LEADERBOARD_GRID,
  LeaderboardPanel,
  LeaderboardTableShell,
  LeaderboardWideColumn,
  leaderboardRowClassName,
  excludePodiumEntries,
  splitIntoColumns,
} from "@/components/leaderboards/leaderboard-layout";
import type { LeaderboardPodiumEntry } from "@/components/leaderboards/leaderboard-rank-styles";
import { LeaderboardRankBadge } from "@/components/leaderboards/leaderboard-rank-styles";
import { LeaderboardTopThree } from "@/components/leaderboards/LeaderboardTopThree";

const HOUR_LEADERBOARD_GRID =
  "xl:grid-cols-[2.5rem_minmax(0,1.5fr)_5.5rem_4.5rem_5.5rem_4rem]";

export type TopEntityListEntry = {
  rank: number;
  key: string;
  name: string;
  href: string;
  region: string;
  killFame: number;
  killCount: number;
  uniqueMembers?: number;
};

function headerColumns(nameLabel: string, byHour: boolean) {
  if (byHour) {
    return [
      { label: "#" },
      { label: nameLabel },
      { label: "Region" },
      { label: "Members", align: "right" as const },
      { label: "Fame", align: "right" as const },
      { label: "Kills", align: "right" as const },
    ];
  }
  return [
    { label: "#" },
    { label: nameLabel },
    { label: "Region" },
    { label: "Fame", align: "right" as const },
    { label: "Kills", align: "right" as const },
  ];
}

function toPodium(
  entries: TopEntityListEntry[],
  byHour: boolean
): LeaderboardPodiumEntry[] {
  return entries.slice(0, 3).map((entry) => ({
    rank: entry.rank,
    name: entry.name,
    href: entry.href,
    subtitle: regionLabel(entry.region),
    stat: byHour
      ? String(entry.uniqueMembers ?? 0)
      : formatFame(entry.killFame),
    statLabel: byHour
      ? `${formatFame(entry.killFame)} fame · ${entry.killCount} kills`
      : `${entry.killCount} kills`,
    statVariant: byHour ? "neutral" : "fame",
  }));
}

function EntityRow({
  entry,
  wide,
  byHour,
}: {
  entry: TopEntityListEntry;
  wide: boolean;
  byHour: boolean;
}) {
  const grid = byHour ? HOUR_LEADERBOARD_GRID : GUILD_LEADERBOARD_GRID;
  return (
    <li className={leaderboardRowClassName(wide, grid, entry.rank)}>
      <LeaderboardRankBadge rank={entry.rank} />
      <div className="min-w-0 flex-1 xl:contents">
        <Link
          href={entry.href}
          className="min-w-0 truncate text-sm font-medium hover:text-primary hover:underline"
        >
          {entry.name}
        </Link>
        <p className="text-xs text-muted-foreground xl:hidden">
          {regionLabel(entry.region)}
        </p>
      </div>
      {wide && (
        <span className="hidden truncate text-xs text-muted-foreground xl:block">
          {regionLabel(entry.region)}
        </span>
      )}
      {wide ? (
        <>
          <div className="shrink-0 text-right text-xs xl:hidden">
            {byHour ? (
              <p className="font-medium tabular-nums">
                {entry.uniqueMembers ?? 0} members
              </p>
            ) : null}
            <p className="font-medium tabular-nums text-stat-fame">
              {formatFame(entry.killFame)} fame
            </p>
            <p className="tabular-nums text-muted-foreground">
              {entry.killCount} kills
            </p>
          </div>
          {byHour ? (
            <p className="hidden shrink-0 text-xs font-medium tabular-nums xl:block xl:text-right">
              {entry.uniqueMembers ?? 0}
            </p>
          ) : null}
          <p className="hidden shrink-0 text-xs font-medium tabular-nums text-stat-fame xl:block xl:text-right">
            {formatFame(entry.killFame)}
          </p>
          <p className="hidden shrink-0 text-xs tabular-nums text-muted-foreground xl:block xl:text-right">
            {entry.killCount}
          </p>
        </>
      ) : (
        <div className="shrink-0 text-right text-xs">
          {byHour ? (
            <p className="font-medium tabular-nums">
              {entry.uniqueMembers ?? 0} members
            </p>
          ) : null}
          <p className="font-medium tabular-nums text-stat-fame">
            {formatFame(entry.killFame)} fame
          </p>
          <p className="tabular-nums text-muted-foreground">
            {entry.killCount} kills
          </p>
        </div>
      )}
    </li>
  );
}

export async function TopEntityList({
  entries,
  layout = "default",
  byHour = false,
  nameColumnLabel,
  emptyIcon: EmptyIcon,
  emptyMessage,
}: {
  entries: TopEntityListEntry[];
  layout?: "default" | "wide";
  byHour?: boolean;
  nameColumnLabel: string;
  emptyIcon: LucideIcon;
  emptyMessage: string;
}) {
  if (entries.length === 0) {
    return <EmptyState icon={EmptyIcon}>{emptyMessage}</EmptyState>;
  }

  const wide = layout === "wide";
  const columns = headerColumns(nameColumnLabel, byHour);
  const grid = byHour ? HOUR_LEADERBOARD_GRID : GUILD_LEADERBOARD_GRID;

  if (!wide) {
    return (
      <LeaderboardPanel>
        <ol className="divide-y divide-border/60">
          {entries.map((entry) => (
            <EntityRow
              key={entry.key}
              entry={entry}
              wide={false}
              byHour={byHour}
            />
          ))}
        </ol>
      </LeaderboardPanel>
    );
  }

  const [left, right] = splitIntoColumns(excludePodiumEntries(entries));

  return (
    <div className="space-y-4">
      <LeaderboardTopThree entries={toPodium(entries, byHour)} />
      <LeaderboardTableShell>
        <LeaderboardWideColumn gridClassName={grid} headerColumns={columns}>
          <ol className="divide-y divide-border/60">
            {left.map((entry) => (
              <EntityRow key={entry.key} entry={entry} wide byHour={byHour} />
            ))}
          </ol>
        </LeaderboardWideColumn>
        <LeaderboardWideColumn gridClassName={grid} headerColumns={columns}>
          <ol className="divide-y divide-border/60">
            {right.map((entry) => (
              <EntityRow key={entry.key} entry={entry} wide byHour={byHour} />
            ))}
          </ol>
        </LeaderboardWideColumn>
      </LeaderboardTableShell>
    </div>
  );
}
