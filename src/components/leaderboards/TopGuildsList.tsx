import { Link } from "@/i18n/navigation";
import { Shield } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/EmptyState";
import { formatFame, regionLabel } from "@/lib/utils";
import { guildPath } from "@/lib/seo";
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

const GUILD_HOUR_HEADER_COLUMNS = [
  { label: "#" },
  { label: "Guild" },
  { label: "Region" },
  { label: "Members", align: "right" as const },
  { label: "Fame", align: "right" as const },
  { label: "Kills", align: "right" as const },
];

const GUILD_HOUR_LEADERBOARD_GRID =
  "xl:grid-cols-[2.5rem_minmax(0,1.5fr)_5.5rem_4.5rem_5.5rem_4rem]";

function guildsToPodium(
  guilds: TopGuildEntry[],
  byHour: boolean
): LeaderboardPodiumEntry[] {
  return guilds.slice(0, 3).map((entry) => ({
    rank: entry.rank,
    name: entry.guild.name,
    href: guildPath(entry.guild.region, entry.guild.name),
    subtitle: regionLabel(entry.guild.region),
    stat: byHour
      ? String(entry.uniqueMembers ?? 0)
      : formatFame(entry.killFame),
    statLabel: byHour
      ? `${formatFame(entry.killFame)} fame · ${entry.killCount} kills`
      : `${entry.killCount} kills`,
    statVariant: byHour ? "neutral" : "fame",
  }));
}

interface TopGuildsListProps {
  guilds: TopGuildEntry[];
  layout?: "default" | "wide";
  byHour?: boolean;
}

function GuildRow({
  entry,
  wide,
  byHour,
}: {
  entry: TopGuildEntry;
  wide: boolean;
  byHour: boolean;
}) {
  const grid = byHour ? GUILD_HOUR_LEADERBOARD_GRID : GUILD_LEADERBOARD_GRID;
  return (
    <li className={leaderboardRowClassName(wide, grid, entry.rank)}>
      <LeaderboardRankBadge rank={entry.rank} />
      <div className="min-w-0 flex-1 xl:contents">
        <Link
          href={guildPath(entry.guild.region, entry.guild.name)}
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

function GuildsColumn({
  entries,
  wide,
  byHour,
}: {
  entries: TopGuildEntry[];
  wide: boolean;
  byHour: boolean;
}) {
  return (
    <ol className="divide-y divide-border/60">
      {entries.map((entry) => (
        <GuildRow
          key={`${entry.guild.region}-${entry.guild.albionId}`}
          entry={entry}
          wide={wide}
          byHour={byHour}
        />
      ))}
    </ol>
  );
}

export async function TopGuildsList({
  guilds,
  layout = "default",
  byHour = false,
}: TopGuildsListProps) {
  const t = await getTranslations("Leaderboards");

  if (guilds.length === 0) {
    return (
      <EmptyState icon={Shield}>
        {byHour ? t("emptyGuildsHour") : t("emptyGuilds")}
      </EmptyState>
    );
  }

  const wide = layout === "wide";
  const headerColumns = byHour
    ? GUILD_HOUR_HEADER_COLUMNS
    : GUILD_HEADER_COLUMNS;
  const grid = byHour ? GUILD_HOUR_LEADERBOARD_GRID : GUILD_LEADERBOARD_GRID;

  if (!wide) {
    return (
      <LeaderboardPanel>
        <GuildsColumn entries={guilds} wide={false} byHour={byHour} />
      </LeaderboardPanel>
    );
  }

  const [left, right] = splitIntoColumns(excludePodiumEntries(guilds));

  return (
    <div className="space-y-4">
      <LeaderboardTopThree entries={guildsToPodium(guilds, byHour)} />
      <LeaderboardTableShell>
      <LeaderboardWideColumn
        gridClassName={grid}
        headerColumns={headerColumns}
      >
        <GuildsColumn entries={left} wide byHour={byHour} />
      </LeaderboardWideColumn>
      <LeaderboardWideColumn
        gridClassName={grid}
        headerColumns={headerColumns}
      >
        <GuildsColumn entries={right} wide byHour={byHour} />
      </LeaderboardWideColumn>
    </LeaderboardTableShell>
    </div>
  );
}
