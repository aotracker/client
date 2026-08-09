import { Suspense } from "react";
import type { Metadata } from "next";
import { BattlesFeed } from "@/components/BattlesFeed";
import { BattlesFilters } from "@/components/BattlesFilters";
import { PageHeader } from "@/components/PageSection";
import { RelativeTime } from "@/components/RelativeTime";
import { countBattlesFeed, getBattlesFeed } from "@/lib/db/queries";
import { BATTLES_FEED_PAGE_SIZE } from "@/lib/battles-constants";
import { getCronJobStatuses } from "@/lib/jobs/cron-state";
import {
  feedRegionFilterOptions,
  parseFeedRegion,
} from "@/lib/region-params";
import { buildFeedPageMetadata } from "@/lib/seo";
import { FilterChipSkeleton } from "@/components/ui/skeleton";

interface BattlesPageProps {
  searchParams: Promise<{ region?: string; q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: BattlesPageProps): Promise<Metadata> {
  const params = await searchParams;
  const region = parseFeedRegion(params.region);

  return buildFeedPageMetadata({
    title: "Latest Albion Online Battles",
    description:
      "Latest Albion Online battles. Search by guild, alliance, or player. Select multiple battles to combine stats",
    canonicalPath: "/battles",
    region,
  });
}

export default async function BattlesPage({ searchParams }: BattlesPageProps) {
  const params = await searchParams;
  const region = parseFeedRegion(params.region);
  const q = params.q?.trim() || undefined;
  const filterRegions = feedRegionFilterOptions();

  let battles: Awaited<ReturnType<typeof getBattlesFeed>> = [];
  let total = 0;
  let error: string | null = null;

  const [feedResult, cronStatus] = await Promise.all([
    Promise.all([
      getBattlesFeed({ region, q, limit: BATTLES_FEED_PAGE_SIZE, offset: 0 }),
      countBattlesFeed({ region, q }),
    ]).catch((e) => {
      error = e instanceof Error ? e.message : "Failed to load battles";
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
        title="Latest Albion Online Battles"
        description="Latest Albion Online battles. Search by guild, alliance, or player. Select multiple battles to combine stats"
        actions={
          lastListUpdatedAt ? (
            <p className="text-xs text-muted-foreground sm:pt-1 sm:text-right">
              Battle list updated{" "}
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
          key={`${region}:${q ?? ""}`}
          initialBattles={battles}
          initialTotal={total}
          region={region}
          searchQuery={q}
          pageSize={BATTLES_FEED_PAGE_SIZE}
        />
      )}
    </div>
  );
}
