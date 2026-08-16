import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { KillFeedFilters } from "@/components/KillFeedFilters";
import { KillsFeedSection } from "@/components/kills/KillsFeedSection";
import { PageHeader } from "@/components/PageSection";
import { FilterChipSkeleton } from "@/components/ui/skeleton";
import { getKillFeed, type ContentTypeFilter } from "@/lib/db/queries";
import {
  KILLS_FEED_PAGE_SIZE,
  parseMinFame,
  parseWatchlistFlag,
} from "@/lib/kills-feed-params";
import { feedRegionFilterOptions } from "@/lib/region-params";
import { resolveServerFeedRegion } from "@/lib/region-preference-server";
import { buildFeedPageMetadata } from "@/lib/seo";

interface KillsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    region?: string;
    type?: string;
    minFame?: string;
    watchlist?: string;
  }>;
}

const CONTENT_TYPES = new Set<ContentTypeFilter>(["all", "SOLO", "GROUP", "ZVZ"]);

function parseContentType(value: string | undefined): ContentTypeFilter {
  if (value && CONTENT_TYPES.has(value as ContentTypeFilter)) {
    return value as ContentTypeFilter;
  }
  return "all";
}

export async function generateMetadata({
  params,
  searchParams,
}: KillsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const search = await searchParams;
  const region = await resolveServerFeedRegion(search.region);
  const t = await getTranslations({ locale, namespace: "Kills" });

  return buildFeedPageMetadata({
    title: t("pageTitle"),
    description: t("pageDescription"),
    canonicalPath: "/kills",
    region,
    locale,
  });
}

export default async function KillsPage({
  params,
  searchParams,
}: KillsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Kills");

  const search = await searchParams;
  const region = await resolveServerFeedRegion(search.region);
  const contentType = parseContentType(search.type);
  const minFame = parseMinFame(search.minFame);
  const watchlistOnly = parseWatchlistFlag(search.watchlist);
  const filterRegions = feedRegionFilterOptions();

  let events: Awaited<ReturnType<typeof getKillFeed>> = [];
  let error: string | null = null;

  try {
    events = await getKillFeed({
      region,
      contentType,
      minFame,
      limit: KILLS_FEED_PAGE_SIZE,
      offset: 0,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : t("failedLoad");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageTitle")} description={t("pageDescription")} />

      <Suspense fallback={<FilterChipSkeleton count={8} />}>
        <KillFeedFilters
          regions={filterRegions}
          activeRegion={region}
          pathname="/kills"
          showMinFame
          showWatchlist
        />
      </Suspense>

      {error ? (
        <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
          {error}
        </div>
      ) : (
        <KillsFeedSection
          key={`${region}:${contentType}:${minFame}:${watchlistOnly}`}
          initialEvents={events}
          region={region}
          contentType={contentType}
          minFame={minFame}
          watchlistOnly={watchlistOnly}
          pageSize={KILLS_FEED_PAGE_SIZE}
        />
      )}
    </div>
  );
}
