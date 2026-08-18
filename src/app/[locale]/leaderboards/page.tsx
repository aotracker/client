import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LeaderboardFilters } from "@/components/leaderboards/LeaderboardFilters";
import { LeaderboardNavigationProvider } from "@/components/leaderboards/LeaderboardNavigation";
import {
  LeaderboardResults,
  LeaderboardResultsFallback,
} from "@/components/leaderboards/LeaderboardResults";
import {
  leaderboardCanonicalPath,
  parseLeaderboardContentType,
  parseLeaderboardDays,
  parseLeaderboardHour,
  parseLeaderboardTab,
  type LeaderboardTab,
} from "@/lib/leaderboards/params";
import { PageHeader } from "@/components/PageSection";
import { FilterChipSkeleton } from "@/components/ui/skeleton";
import { feedRegionFilterOptions } from "@/lib/region-params";
import { resolveServerFeedRegion } from "@/lib/region-preference-server";
import { formatUtcHour, isPrimeTimeHourForFilter } from "@/lib/albion/prime-times";
import { regionLabel } from "@/lib/utils";
import { buildFeedPageMetadata } from "@/lib/seo";

interface LeaderboardsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    tab?: string;
    region?: string;
    days?: string;
    type?: string;
    hour?: string;
  }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: LeaderboardsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const search = await searchParams;
  const tab = parseLeaderboardTab(search.tab);
  const region = await resolveServerFeedRegion(search.region);
  const t = await getTranslations({ locale, namespace: "Leaderboards" });
  const keys = tabMetaKey(tab);

  return buildFeedPageMetadata({
    title: t(keys.metaTitle as "tabs.killers.metaTitle"),
    description: t(keys.metaDescription as "tabs.killers.metaDescription"),
    canonicalPath: leaderboardCanonicalPath(tab),
    region,
    locale,
  });
}

function tabMetaKey(tab: LeaderboardTab): {
  label: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
} {
  return {
    label: `tabs.${tab}.label`,
    description: `tabs.${tab}.description`,
    metaTitle: `tabs.${tab}.metaTitle`,
    metaDescription: `tabs.${tab}.metaDescription`,
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
  const region = await resolveServerFeedRegion(search.region);
  const days = parseLeaderboardDays(search.days);
  const contentType = parseLeaderboardContentType(search.type);
  const parsedHour = parseLeaderboardHour(search.hour);
  const utcHour =
    parsedHour != null && isPrimeTimeHourForFilter(region, parsedHour)
      ? parsedHour
      : undefined;
  const filterRegions = feedRegionFilterOptions();

  const keys = tabMetaKey(tab);
  const tabLabel = t(keys.label as "tabs.killers.label");
  const tabDescription =
    tab === "guilds" && utcHour != null
      ? t("tabs.guilds.descriptionHour")
      : t(keys.description as "tabs.killers.description");
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

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

      <Suspense fallback={<FilterChipSkeleton count={6} />}>
        <LeaderboardNavigationProvider>
          <LeaderboardFilters regions={filterRegions} activeRegion={region} />

          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{tabLabel}</h2>
            <p className="text-sm text-muted-foreground">
              {utcHour != null && tab === "guilds"
                ? t("summaryLineHour", {
                    tabDescription,
                    region: regionLabelText,
                    days,
                    content: contentLabel,
                    hour: formatUtcHour(utcHour),
                  })
                : t("summaryLine", {
                    tabDescription,
                    region: regionLabelText,
                    days,
                    content: contentLabel,
                  })}
            </p>
          </div>

          <Suspense fallback={<LeaderboardResultsFallback />}>
            <LeaderboardResults
              tab={tab}
              region={region}
              days={days}
              contentType={contentType}
              utcHour={utcHour}
            />
          </Suspense>
        </LeaderboardNavigationProvider>
      </Suspense>
    </div>
  );
}
