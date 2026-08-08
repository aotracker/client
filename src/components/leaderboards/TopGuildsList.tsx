import Link from "next/link";
import { formatFame, regionLabel } from "@/lib/utils";
import type { TopGuildEntry } from "@/lib/db/queries";
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

const GUILD_HEADER_COLUMNS = [
  { label: "#" },
  { label: "Guild" },
  { label: "Region" },
  { label: "Fame", align: "right" as const },
  { label: "Kills", align: "right" as const },
];

function guildsToPodium(guilds: TopGuildEntry[]): LeaderboardPodiumEntry[] {
  return guilds.slice(0, 3).map((entry) => ({
    rank: entry.rank,
    name: entry.guild.name,
    href: `/guild/${entry.guild.region}/${entry.guild.albionId}`,
    subtitle: regionLabel(entry.guild.region),
    stat: formatFame(entry.killFame),
    statLabel: `${entry.killCount} kills`,
    statVariant: "fame",
  }));
}

interface TopGuildsListProps {
  guilds: TopGuildEntry[];
  layout?: "default" | "wide";
}

function GuildRow({
  entry,
  wide,
}: {
  entry: TopGuildEntry;
  wide: boolean;
}) {
  return (
    <li
      className={leaderboardRowClassName(wide, GUILD_LEADERBOARD_GRID, entry.rank)}
    >
      <LeaderboardRankBadge rank={entry.rank} />
      <div className="min-w-0 flex-1 xl:contents">
        <Link
          href={`/guild/${entry.guild.region}/${entry.guild.albionId}`}
          className="min-w-0 truncate text-sm font-medium hover:text-primary hover:underline"
        >
          {entry.guild.name}
        </Link>
        {!wide ? (
          <p className="text-xs text-muted-foreground">
            {regionLabel(entry.guild.region)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground xl:hidden">
            {regionLabel(entry.guild.region)}
          </p>
        )}
      </div>
      {wide && (
        <span className="hidden truncate text-xs text-muted-foreground xl:block">
          {regionLabel(entry.guild.region)}
        </span>
      )}
      {wide ? (
        <>
          <div className="shrink-0 text-right text-xs xl:hidden">
            <p className="font-medium tabular-nums text-stat-fame">
              {formatFame(entry.killFame)} fame
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

function GuildsColumn({
  entries,
  wide,
}: {
  entries: TopGuildEntry[];
  wide: boolean;
}) {
  return (
    <ol className="divide-y divide-border/60">
      {entries.map((entry) => (
        <GuildRow
          key={`${entry.guild.region}-${entry.guild.albionId}`}
          entry={entry}
          wide={wide}
        />
      ))}
    </ol>
  );
}

export function TopGuildsList({
  guilds,
  layout = "default",
}: TopGuildsListProps) {
  if (guilds.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No guild kill fame in this period
      </div>
    );
  }

  const wide = layout === "wide";

  if (!wide) {
    return (
      <LeaderboardPanel>
        <GuildsColumn entries={guilds} wide={false} />
      </LeaderboardPanel>
    );
  }

  const [left, right] = splitIntoColumns(excludePodiumEntries(guilds));

  return (
    <div className="space-y-4">
      <LeaderboardTopThree entries={guildsToPodium(guilds)} />
      <LeaderboardTableShell>
      <LeaderboardWideColumn
        gridClassName={GUILD_LEADERBOARD_GRID}
        headerColumns={GUILD_HEADER_COLUMNS}
      >
        <GuildsColumn entries={left} wide />
      </LeaderboardWideColumn>
      <LeaderboardWideColumn
        gridClassName={GUILD_LEADERBOARD_GRID}
        headerColumns={GUILD_HEADER_COLUMNS}
      >
        <GuildsColumn entries={right} wide />
      </LeaderboardWideColumn>
    </LeaderboardTableShell>
    </div>
  );
}
