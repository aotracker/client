import { Swords } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { KillCardServer } from "@/components/KillCardServer";
import type { LeaderboardPodiumEntry } from "@/components/leaderboards/leaderboard-rank-styles";
import { LeaderboardTopThree } from "@/components/leaderboards/LeaderboardTopThree";
import { LEADERBOARD_PODIUM_COUNT } from "@/components/leaderboards/leaderboard-layout";
import type { getRecentJuicyKills } from "@/lib/db/queries";
import { formatFame, regionLabel } from "@/lib/utils";

type JuicyKill = Awaited<ReturnType<typeof getRecentJuicyKills>>[number];

function killsToPodium(kills: JuicyKill[]): LeaderboardPodiumEntry[] {
  return kills.slice(0, 3).map((event, index) => ({
    rank: index + 1,
    name: event.killer?.name
      ? `${event.killer.name} → ${event.victim?.name ?? "Unknown"}`
      : (event.victim?.name ?? "Unknown kill"),
    href: `/kill/${event.region}/${event.eventId}`,
    subtitle: [
      regionLabel(event.region),
      event.killer?.guild?.name,
    ]
      .filter(Boolean)
      .join(" · "),
    stat: formatFame(event.totalVictimKillFame),
    statLabel: "fame",
    statVariant: "fame",
  }));
}

interface LeaderboardKillsListProps {
  kills: JuicyKill[];
}

export function LeaderboardKillsList({ kills }: LeaderboardKillsListProps) {
  if (kills.length === 0) {
    return <EmptyState icon={Swords}>No kills in this period</EmptyState>;
  }

  return (
    <div className="space-y-4">
      <LeaderboardTopThree entries={killsToPodium(kills)} />
      <div className="space-y-3">
        {kills.slice(LEADERBOARD_PODIUM_COUNT).map((event, index) => (
          <KillCardServer
            key={`${event.region}-${event.eventId}`}
            event={event}
            compact
            compactSize="large"
            rank={index + LEADERBOARD_PODIUM_COUNT + 1}
          />
        ))}
      </div>
    </div>
  );
}
