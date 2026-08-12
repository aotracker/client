import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TopKillersList } from "@/components/TopKillersList";
import { LeaderboardFilters } from "@/components/leaderboards/LeaderboardFilters";
import { LeaderboardKillsList } from "@/components/leaderboards/LeaderboardKillsList";
import {
  LeaderboardNavigationProvider,
  LeaderboardResultsPending,
} from "@/components/leaderboards/LeaderboardNavigation";
import {
  parseLeaderboardContentType,
  parseLeaderboardDays,
  parseLeaderboardTab,
  type LeaderboardTab,
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
  feedRegionFilterOptions,
  parseFeedRegion,
} from "@/lib/region-params";
import { regionLabel } from "@/lib/utils";
import { buildFeedPageMetadata } from "@/lib/seo";

interface LeaderboardsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    tab?: string;
    region?: string;
    days?: string;
    type?: string;
  }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: LeaderboardsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const search = await searchParams;
  const region = parseFeedRegion(search.region);
  const t = await getTranslations({ locale, namespace: "Leaderboards" });

  return buildFeedPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonicalPath: "/leaderboards",
    region,
    locale,
  });
}

function tabMetaKey(tab: LeaderboardTab): {
  label: string;
  description: string;
} {
  return {
    label: `tabs.${tab}.label`,
    description: `tabs.${tab}.description`,
  };
}

export default async function LeaderboardsPage({
  params,
  searchParams,
}: LeaderboardsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Leaderboards");
  const tCommon = await getTranslations("Common");

  const search = await searchParams;
  const tab = parseLeaderboardTab(search.tab);
  const region = parseFeedRegion(search.region);
  const days = parseLeaderboardDays(search.days);
  const contentType = parseLeaderboardContentType(search.type);
  const filterRegions = feedRegionFilterOptions();

  const filters = {
    region,
    days,
    contentType,
    limit: 50,
  };

  const keys = tabMetaKey(tab);
  const tabLabel = t(keys.label as "tabs.killers.label");
  const tabDescription = t(keys.description as "tabs.killers.description");
  const regionLabelText =
    region === "all" ? tCommon("regions.all") : regionLabel(region);
  const contentLabel =
    contentType === "all"
      ? tCommon("labels.allContent")
      : contentType === "SOLO"
        ? tCommon("contentTypes.SOLO")
        : contentType === "GROUP"
          ? tCommon("contentTypes.GROUP")
          : tCommon("contentTypes.ZVZ");

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
    error = e instanceof Error ? e.message : t("failedLoad");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

      <Suspense fallback={<FilterChipSkeleton count={6} />}>
        <LeaderboardNavigationProvider>
          <LeaderboardFilters regions={filterRegions} />

          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{tabLabel}</h2>
            <p className="text-sm text-muted-foreground">
              {t("summaryLine", {
                tabDescription,
                region: regionLabelText,
                days,
                content: contentLabel,
              })}
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
