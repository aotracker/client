import { Suspense } from "react";
import type { Metadata } from "next";
import { TopKillersList } from "@/components/TopKillersList";
import { LeaderboardFilters } from "@/components/leaderboards/LeaderboardFilters";
import { LeaderboardKillsList } from "@/components/leaderboards/LeaderboardKillsList";
import {
  LeaderboardNavigationProvider,
  LeaderboardResultsPending,
} from "@/components/leaderboards/LeaderboardNavigation";
import {
  LEADERBOARD_TAB_META,
  parseLeaderboardContentType,
  parseLeaderboardDays,
  parseLeaderboardTab,
} from "@/lib/leaderboards/params";
import { TopFameList } from "@/components/leaderboards/TopFameList";
import { TopGuildsList } from "@/components/leaderboards/TopGuildsList";
import { PageHeader } from "@/components/PageSection";
import { FilterChipSkeleton } from "@/components/ui/skeleton";
import {
  getRecentJuicyKills,
  getTopGuildsByKillFame,
  getTopKillers,
  getTopPlayersByKillFame,
} from "@/lib/db/queries";
import {
  ENABLED_REGIONS,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";
import { regionLabel } from "@/lib/utils";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Albion Online PvP Leaderboards",
  description:
    "Top killers, guilds, and highest fame kills from tracked Albion Online PvP data. Filter by region, content type, and time period.",
  canonicalPath: "/leaderboards",
});

interface LeaderboardsPageProps {
  searchParams: Promise<{
    tab?: string;
    region?: string;
    days?: string;
    type?: string;
  }>;
}

export default async function LeaderboardsPage({
  searchParams,
}: LeaderboardsPageProps) {
  const params = await searchParams;
  const tab = parseLeaderboardTab(params.tab);
  const requested = params.region ?? "all";
  const region: AlbionRegion | "all" =
    requested === "all" || !isRegionEnabled(requested) ? "all" : requested;
  const days = parseLeaderboardDays(params.days);
  const contentType = parseLeaderboardContentType(params.type);

  const filterRegions: { value: AlbionRegion | "all"; label: string }[] = [
    { value: "all", label: "All Regions" },
    ...ENABLED_REGIONS.map((r) => ({ value: r, label: regionLabel(r) })),
  ];

  const filters = {
    region,
    days,
    contentType,
    limit: 50,
  };

  const tabMeta = LEADERBOARD_TAB_META[tab];
  const regionLabelText =
    region === "all" ? "All regions" : regionLabel(region);
  const contentLabel =
    contentType === "all"
      ? "All content"
      : contentType === "SOLO"
        ? "1v1"
        : contentType === "GROUP"
          ? "Group"
          : "ZvZ";

  let error: string | null = null;
  let killers: Awaited<ReturnType<typeof getTopKillers>> = [];
  let guilds: Awaited<ReturnType<typeof getTopGuildsByKillFame>> = [];
  let kills: Awaited<ReturnType<typeof getRecentJuicyKills>> = [];
  let fame: Awaited<ReturnType<typeof getTopPlayersByKillFame>> = [];

  try {
    if (tab === "killers") {
      killers = await getTopKillers(filters);
    } else if (tab === "guilds") {
      guilds = await getTopGuildsByKillFame(filters);
    } else if (tab === "kills") {
      kills = await getRecentJuicyKills({ ...filters, limit: 25 });
    } else {
      fame = await getTopPlayersByKillFame(filters);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load leaderboards";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="PvP Leaderboards"
        description="Top performers from cached Albion kill data. Pick a leaderboard, then narrow by region, period, and content type."
      />

      <Suspense fallback={<FilterChipSkeleton count={6} />}>
        <LeaderboardNavigationProvider>
          <LeaderboardFilters regions={filterRegions} />

          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{tabMeta.label}</h2>
            <p className="text-sm text-muted-foreground">
              {tabMeta.description} · {regionLabelText} · Last {days} days ·{" "}
              {contentLabel}
            </p>
          </div>

          <LeaderboardResultsPending>
            {error ? (
              <div className="alert-danger rounded-md p-4 text-sm">{error}</div>
            ) : tab === "killers" ? (
              <TopKillersList killers={killers} layout="wide" />
            ) : tab === "guilds" ? (
              <TopGuildsList guilds={guilds} layout="wide" />
            ) : tab === "kills" ? (
              <LeaderboardKillsList kills={kills} />
            ) : (
              <TopFameList entries={fame} layout="wide" />
            )}
          </LeaderboardResultsPending>
        </LeaderboardNavigationProvider>
      </Suspense>
    </div>
  );
}
