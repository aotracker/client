import { Link } from "@/i18n/navigation";
import { Trophy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { regionLabel } from "@/lib/utils";
import { guildPath, playerPath } from "@/lib/seo";
import type { TopKillerEntry } from "@/lib/db/queries";
import {
  KILLER_LEADERBOARD_GRID,
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

const KILLER_HEADER_COLUMNS = [
  { label: "#" },
  { label: "Player" },
  { label: "Region" },
  { label: "Guild" },
  { label: "Kills", align: "right" as const },
];

function killersToPodium(killers: TopKillerEntry[]): LeaderboardPodiumEntry[] {
  return killers.map((entry) => ({
    rank: entry.rank,
    name: entry.player.name,
    href: playerPath(entry.player.region, entry.player.name),
    subtitle: [
      regionLabel(entry.player.region),
      entry.player.guild?.name,
    ]
      .filter(Boolean)
      .join(" · "),
    stat: String(entry.killCount),
    statLabel: entry.killCount === 1 ? "kill" : "kills",
    statVariant: "kill",
  }));
}

interface TopKillersListProps {
  killers: TopKillerEntry[];
  layout?: "default" | "wide" | "podium" | "stack";
}

function KillerRow({
  entry,
  wide,
}: {
  entry: TopKillerEntry;
  wide: boolean;
}) {
  return (
    <li
      className={leaderboardRowClassName(wide, KILLER_LEADERBOARD_GRID, entry.rank)}
    >
      <LeaderboardRankBadge rank={entry.rank} />
      <div className="min-w-0 flex-1 xl:contents">
        <Link
          href={playerPath(entry.player.region, entry.player.name)}
          className="min-w-0 truncate text-sm font-medium hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {entry.player.name}
        </Link>
        {!wide ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>{regionLabel(entry.player.region)}</span>
            {entry.player.guild?.name && (
              <>
                <span className="text-muted-foreground/50" aria-hidden>
                  ·
                </span>
                {entry.player.guild.albionId ? (
                  <Link
                    href={guildPath(entry.player.region, entry.player.guild.name)}
                    className="truncate hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                <span className="text-muted-foreground/50" aria-hidden>
                  ·
                </span>
                {entry.player.guild.albionId ? (
                  <Link
                    href={guildPath(entry.player.region, entry.player.guild.name)}
                    className="truncate hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
      <span className="shrink-0 text-xs font-medium tabular-nums text-stat-kill xl:text-right">
        {entry.killCount}
        <span className="ml-1 font-normal text-muted-foreground xl:hidden">
          {entry.killCount === 1 ? "kill" : "kills"}
        </span>
      </span>
    </li>
  );
}

function KillersColumn({
  entries,
  wide,
}: {
  entries: TopKillerEntry[];
  wide: boolean;
}) {
  return (
    <ol className="divide-y divide-border/60">
      {entries.map((entry) => (
        <KillerRow
          key={`${entry.player.region}-${entry.player.albionId}`}
          entry={entry}
          wide={wide}
        />
      ))}
    </ol>
  );
}

export function TopKillersList({
  killers,
  layout = "default",
}: TopKillersListProps) {
  if (killers.length === 0) {
    return (
      <EmptyState icon={Trophy}>No PvP kills in the last 7 days</EmptyState>
    );
  }

  if (layout === "podium") {
    return <LeaderboardTopThree entries={killersToPodium(killers)} variant="podium" />;
  }

  if (layout === "stack") {
    return <LeaderboardTopThree entries={killersToPodium(killers)} variant="stack" />;
  }

  const wide = layout === "wide";

  if (!wide) {
    return (
      <LeaderboardPanel>
        <KillersColumn entries={killers} wide={false} />
      </LeaderboardPanel>
    );
  }

  const [left, right] = splitIntoColumns(excludePodiumEntries(killers));

  return (
    <div className="space-y-4">
      <LeaderboardTopThree entries={killersToPodium(killers)} />
      <LeaderboardTableShell>
      <LeaderboardWideColumn
        gridClassName={KILLER_LEADERBOARD_GRID}
        headerColumns={KILLER_HEADER_COLUMNS}
      >
        <KillersColumn entries={left} wide />
      </LeaderboardWideColumn>
      <LeaderboardWideColumn
        gridClassName={KILLER_LEADERBOARD_GRID}
        headerColumns={KILLER_HEADER_COLUMNS}
      >
        <KillersColumn entries={right} wide />
      </LeaderboardWideColumn>
    </LeaderboardTableShell>
    </div>
  );
}
