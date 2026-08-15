import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BattlesFeed } from "@/components/BattlesFeed";
import { BattlesFilters } from "@/components/BattlesFilters";
import { PageHeader } from "@/components/PageSection";
import { RelativeTime } from "@/components/RelativeTime";
import { countBattlesFeed, getBattlesFeed } from "@/lib/db/queries";
import {
  BATTLES_FEED_PAGE_SIZE,
  parseBattlesMinPlayers,
} from "@/lib/battles-constants";
import { getCronJobStatuses } from "@/lib/jobs/cron-state";
import {
  feedRegionFilterOptions,
  parseFeedRegion,
} from "@/lib/region-params";
import { buildFeedPageMetadata } from "@/lib/seo";
import { FilterChipSkeleton } from "@/components/ui/skeleton";

interface BattlesPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ region?: string; q?: string; minPlayers?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: BattlesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const search = await searchParams;
  const region = parseFeedRegion(search.region);
  const t = await getTranslations({ locale, namespace: "Battle" });

  return buildFeedPageMetadata({
    title: t("pageTitle"),
    description: t("pageDescription"),
    canonicalPath: "/battles",
    region,
    locale,
  });
}

export default async function BattlesPage({
  params,
  searchParams,
}: BattlesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Battle");

  const search = await searchParams;
  const region = parseFeedRegion(search.region);
  const q = search.q?.trim() || undefined;
  const minPlayers = parseBattlesMinPlayers(search.minPlayers);
  const filterRegions = feedRegionFilterOptions();

  let battles: Awaited<ReturnType<typeof getBattlesFeed>> = [];
  let total = 0;
  let error: string | null = null;

  const [feedResult, cronStatus] = await Promise.all([
    Promise.all([
      getBattlesFeed({
        region,
        q,
        minPlayers,
        limit: BATTLES_FEED_PAGE_SIZE,
        offset: 0,
      }),
      countBattlesFeed({ region, q, minPlayers }),
    ]).catch((e) => {
      error = e instanceof Error ? e.message : t("feed.failedLoad");
      return null;
    }),
    getCronJobStatuses().catch(() => null),
  ]);

  if (feedResult) {
    battles = feedResult[0];
    total = feedResult[1];
  }

  const lastListUpdatedAt =
    cronStatus?.jobs.find((job) => job.jobKey === "ingest")?.lastSuccessAt ??
    null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        actions={
          lastListUpdatedAt ? (
            <p className="text-xs text-muted-foreground sm:pt-1 sm:text-right">
              {t("listUpdated", { time: "" }).trimEnd()}{" "}
              <RelativeTime date={lastListUpdatedAt} />
            </p>
          ) : null
        }
      />

      <Suspense fallback={<FilterChipSkeleton count={4} />}>
        <BattlesFilters regions={filterRegions} />
      </Suspense>

      {error ? (
        <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
          {error}
        </div>
      ) : (
        <BattlesFeed
          key={`${region}:${q ?? ""}:${minPlayers}`}
          initialBattles={battles}
          initialTotal={total}
          region={region}
          searchQuery={q}
          minPlayers={minPlayers}
          pageSize={BATTLES_FEED_PAGE_SIZE}
        />
      )}
    </div>
  );
}
