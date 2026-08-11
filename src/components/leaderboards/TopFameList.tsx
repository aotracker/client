import Link from "next/link";
import { formatFame, regionLabel } from "@/lib/utils";
import { guildPath, playerPath } from "@/lib/seo";
import type { TopFameEntry } from "@/lib/db/queries";
import {
  FAME_LEADERBOARD_GRID,
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

const FAME_HEADER_COLUMNS = [
  { label: "#" },
  { label: "Player" },
  { label: "Region" },
  { label: "Guild" },
  { label: "Fame", align: "right" as const },
  { label: "Kills", align: "right" as const },
];

function fameToPodiumEntries(entries: TopFameEntry[]): LeaderboardPodiumEntry[] {
  return entries.map((entry) => ({
    rank: entry.rank,
    name: entry.player.name,
    href: playerPath(entry.player.region, entry.player.name),
    subtitle: [
      regionLabel(entry.player.region),
      entry.player.guild?.name,
    ]
      .filter(Boolean)
      .join(" · "),
    stat: formatFame(entry.killFame),
    statLabel: `${entry.killCount} kills`,
    statVariant: "fame",
  }));
}

interface TopFameListProps {
  entries: TopFameEntry[];
  layout?: "default" | "wide" | "stack";
}

function FameRow({
  entry,
  wide,
}: {
  entry: TopFameEntry;
  wide: boolean;
}) {
  return (
    <li
      className={leaderboardRowClassName(wide, FAME_LEADERBOARD_GRID, entry.rank)}
    >
      <LeaderboardRankBadge rank={entry.rank} />
      <div className="min-w-0 flex-1 xl:contents">
        <Link
          href={playerPath(entry.player.region, entry.player.name)}
          className="min-w-0 truncate text-sm font-medium hover:text-primary hover:underline"
        >
          {entry.player.name}
        </Link>
        {!wide ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>{regionLabel(entry.player.region)}</span>
            {entry.player.guild?.name && (
              <>
                <span aria-hidden>·</span>
                {entry.player.guild.albionId ? (
                  <Link
                    href={guildPath(entry.player.region, entry.player.guild.name)}
                    className="truncate hover:text-primary hover:underline"
                  >
                    {entry.player.guild.name}
                  </Link>
                ) : (
                  <span className="truncate">{entry.player.guild.name}</span>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground xl:hidden">
            <span>{regionLabel(entry.player.region)}</span>
            {entry.player.guild?.name && (
              <>
                <span aria-hidden>·</span>
                {entry.player.guild.albionId ? (
                  <Link
                    href={guildPath(entry.player.region, entry.player.guild.name)}
                    className="truncate hover:text-primary hover:underline"
                  >
                    {entry.player.guild.name}
                  </Link>
                ) : (
                  <span className="truncate">{entry.player.guild.name}</span>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {wide && (
        <>
          <span className="hidden truncate text-xs text-muted-foreground xl:block">
            {regionLabel(entry.player.region)}
          </span>
          <span className="hidden min-w-0 truncate text-xs text-muted-foreground xl:block">
            {entry.player.guild?.albionId ? (
              <Link
                href={guildPath(entry.player.region, entry.player.guild.name)}
                className="truncate hover:text-primary hover:underline"
              >
                {entry.player.guild.name}
              </Link>
            ) : (
              entry.player.guild?.name ?? "—"
            )}
          </span>
        </>
      )}
      {wide ? (
        <>
          <div className="shrink-0 text-right text-xs xl:hidden">
            <p className="font-medium tabular-nums text-stat-fame">
              {formatFame(entry.killFame)}
            </p>
            <p className="tabular-nums text-muted-foreground">
              {entry.killCount} kills
            </p>
          </div>
          <p className="hidden shrink-0 text-xs font-medium tabular-nums text-stat-fame xl:block xl:text-right">
            {formatFame(entry.killFame)}
          </p>
          <p className="hidden shrink-0 text-xs tabular-nums text-muted-foreground xl:block xl:text-right">
            {entry.killCount}
          </p>
        </>
      ) : (
        <div className="shrink-0 text-right text-xs">
          <p className="font-medium tabular-nums text-stat-fame">
            {formatFame(entry.killFame)}
          </p>
          <p className="tabular-nums text-muted-foreground">
            {entry.killCount} kills
          </p>
        </div>
      )}
    </li>
  );
}

function FameColumn({
  entries,
  wide,
}: {
  entries: TopFameEntry[];
  wide: boolean;
}) {
  return (
    <ol className="divide-y divide-border/60">
      {entries.map((entry) => (
        <FameRow
          key={`${entry.player.region}-${entry.player.albionId}`}
          entry={entry}
          wide={wide}
        />
      ))}
    </ol>
  );
}

export function TopFameList({
  entries,
  layout = "default",
}: TopFameListProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No kill fame in this period
      </div>
    );
  }

  if (layout === "stack") {
    return (
      <LeaderboardTopThree
        entries={fameToPodiumEntries(entries)}
        variant="stack"
      />
    );
  }

  const wide = layout === "wide";

  if (!wide) {
    return (
      <LeaderboardPanel>
        <FameColumn entries={entries} wide={false} />
      </LeaderboardPanel>
    );
  }

  const [left, right] = splitIntoColumns(excludePodiumEntries(entries));

  return (
    <div className="space-y-4">
      <LeaderboardTopThree entries={fameToPodiumEntries(entries).slice(0, 3)} />
      <LeaderboardTableShell>
      <LeaderboardWideColumn
        gridClassName={FAME_LEADERBOARD_GRID}
        headerColumns={FAME_HEADER_COLUMNS}
      >
        <FameColumn entries={left} wide />
      </LeaderboardWideColumn>
      <LeaderboardWideColumn
        gridClassName={FAME_LEADERBOARD_GRID}
        headerColumns={FAME_HEADER_COLUMNS}
      >
        <FameColumn entries={right} wide />
      </LeaderboardWideColumn>
    </LeaderboardTableShell>
    </div>
  );
}
