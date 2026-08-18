import { getTranslations } from "next-intl/server";
import { InlineAlert } from "@/components/InlineAlert";
import { TopKillersList } from "@/components/TopKillersList";
import { LeaderboardKillsList } from "@/components/leaderboards/LeaderboardKillsList";
import { LeaderboardResultsPending } from "@/components/leaderboards/LeaderboardNavigation";
import { TopFameList } from "@/components/leaderboards/TopFameList";
import { TopAlliancesList } from "@/components/leaderboards/TopAlliancesList";
import { TopGuildsList } from "@/components/leaderboards/TopGuildsList";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeaderboardTab } from "@/lib/leaderboards/params";
import type { AlbionRegion } from "@/lib/albion/types";
import type { ContentTypeFilter } from "@/lib/db/queries";
import {
  getRecentJuicyKills,
  getTopAlliancesByKillFame,
  getTopGuildsByKillFame,
  getTopKillers,
  getTopPlayersByKillFame,
} from "@/lib/db/queries";

export interface LeaderboardResultsProps {
  tab: LeaderboardTab;
  region: AlbionRegion | "all";
  days: number;
  contentType: ContentTypeFilter;
  utcHour?: number;
}

export function LeaderboardResultsFallback() {
  return (
    <div
      className="space-y-2"
      aria-busy="true"
      aria-label="Loading leaderboard"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-md" />
      ))}
    </div>
  );
}

export async function LeaderboardResults({
  tab,
  region,
  days,
  contentType,
  utcHour,
}: LeaderboardResultsProps) {
  const t = await getTranslations("Leaderboards");
  const filters = {
    region,
    days,
    contentType,
    limit: 50,
    utcHour,
  };

  let error: string | null = null;
  let killers: Awaited<ReturnType<typeof getTopKillers>> = [];
  let guilds: Awaited<ReturnType<typeof getTopGuildsByKillFame>> = [];
  let alliances: Awaited<ReturnType<typeof getTopAlliancesByKillFame>> = [];
  let kills: Awaited<ReturnType<typeof getRecentJuicyKills>> = [];
  let fame: Awaited<ReturnType<typeof getTopPlayersByKillFame>> = [];

  try {
    if (tab === "killers") {
      killers = await getTopKillers(filters);
    } else if (tab === "guilds") {
      guilds = await getTopGuildsByKillFame(filters);
    } else if (tab === "alliances") {
      alliances = await getTopAlliancesByKillFame(filters);
    } else if (tab === "kills") {
      kills = await getRecentJuicyKills({ ...filters, limit: 25 });
    } else {
      fame = await getTopPlayersByKillFame(filters);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : t("failedLoad");
  }

  return (
    <LeaderboardResultsPending>
      {error ? (
        <InlineAlert>{error}</InlineAlert>
      ) : tab === "killers" ? (
        <TopKillersList killers={killers} layout="wide" />
      ) : tab === "guilds" ? (
        <TopGuildsList
          guilds={guilds}
          layout="wide"
          byHour={utcHour != null}
        />
      ) : tab === "alliances" ? (
        <TopAlliancesList alliances={alliances} layout="wide" />
      ) : tab === "kills" ? (
        <LeaderboardKillsList kills={kills} />
      ) : (
        <TopFameList entries={fame} layout="wide" />
      )}
    </LeaderboardResultsPending>
  );
}
