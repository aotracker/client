import { Link } from "@/i18n/navigation";
import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/EmptyState";
import { formatFame, regionLabel } from "@/lib/utils";
import { alliancePath } from "@/lib/seo";
import type { TopAllianceEntry } from "@/lib/db/queries";
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

const ALLIANCE_HEADER_COLUMNS = [
  { label: "#" },
  { label: "Alliance" },
  { label: "Region" },
  { label: "Fame", align: "right" as const },
  { label: "Kills", align: "right" as const },
];

function alliancesToPodium(
  alliances: TopAllianceEntry[]
): LeaderboardPodiumEntry[] {
  return alliances.slice(0, 3).map((entry) => ({
    rank: entry.rank,
    name: entry.alliance.name,
    href: alliancePath(entry.alliance.region, entry.alliance.albionId),
    subtitle: regionLabel(entry.alliance.region),
    stat: formatFame(entry.killFame),
    statLabel: `${entry.killCount} kills`,
    statVariant: "fame",
  }));
}

function AllianceRow({
  entry,
  wide,
}: {
  entry: TopAllianceEntry;
  wide: boolean;
}) {
  return (
    <li className={leaderboardRowClassName(wide, GUILD_LEADERBOARD_GRID, entry.rank)}>
      <LeaderboardRankBadge rank={entry.rank} />
      <div className="min-w-0 flex-1 xl:contents">
        <Link
          href={alliancePath(entry.alliance.region, entry.alliance.albionId)}
          className="min-w-0 truncate text-sm font-medium hover:text-primary hover:underline"
        >
          {entry.alliance.name}
        </Link>
        <p className="text-xs text-muted-foreground xl:hidden">
          {regionLabel(entry.alliance.region)}
        </p>
      </div>
      {wide && (
        <span className="hidden truncate text-xs text-muted-foreground xl:block">
          {regionLabel(entry.alliance.region)}
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

export async function TopAlliancesList({
  alliances,
  layout = "default",
}: {
  alliances: TopAllianceEntry[];
  layout?: "default" | "wide";
}) {
  const t = await getTranslations("Leaderboards");

  if (alliances.length === 0) {
    return <EmptyState icon={Users}>{t("emptyAlliances")}</EmptyState>;
  }

  const wide = layout === "wide";

  if (!wide) {
    return (
      <LeaderboardPanel>
        <ol className="divide-y divide-border/60">
          {alliances.map((entry) => (
            <AllianceRow
              key={`${entry.alliance.region}-${entry.alliance.albionId}`}
              entry={entry}
              wide={false}
            />
          ))}
        </ol>
      </LeaderboardPanel>
    );
  }

  const [left, right] = splitIntoColumns(excludePodiumEntries(alliances));

  return (
    <div className="space-y-4">
      <LeaderboardTopThree entries={alliancesToPodium(alliances)} />
      <LeaderboardTableShell>
        <LeaderboardWideColumn
          gridClassName={GUILD_LEADERBOARD_GRID}
          headerColumns={ALLIANCE_HEADER_COLUMNS}
        >
          <ol className="divide-y divide-border/60">
            {left.map((entry) => (
              <AllianceRow
                key={`${entry.alliance.region}-${entry.alliance.albionId}`}
                entry={entry}
                wide
              />
            ))}
          </ol>
        </LeaderboardWideColumn>
        <LeaderboardWideColumn
          gridClassName={GUILD_LEADERBOARD_GRID}
          headerColumns={ALLIANCE_HEADER_COLUMNS}
        >
          <ol className="divide-y divide-border/60">
            {right.map((entry) => (
              <AllianceRow
                key={`${entry.alliance.region}-${entry.alliance.albionId}`}
                entry={entry}
                wide
              />
            ))}
          </ol>
        </LeaderboardWideColumn>
      </LeaderboardTableShell>
    </div>
  );
}
