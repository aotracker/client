import Link from "next/link";
import { KillFeedFilters } from "@/components/KillFeedFilters";
import { KillFeedList } from "@/components/KillFeedList";
import { KillCard } from "@/components/KillCard";
import { TopKillersList } from "@/components/TopKillersList";
import { PageSection } from "@/components/PageSection";
import {
  getKillFeed,
  getRecentJuicyKills,
  getTopKillers,
  type ContentTypeFilter,
} from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { appendFeedRegionToHref } from "@/lib/region-params";
import {
  FilterChipSkeleton,
  KillCardSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";
import { Suspense } from "react";

const FEED_PAGE_SIZE = 30;

type FilterRegion = { value: AlbionRegion | "all"; label: string };

export async function JuicyKillsSection({
  region,
}: {
  region: AlbionRegion | "all";
}) {
  let juicyKills: Awaited<ReturnType<typeof getRecentJuicyKills>> = [];
  let error: string | null = null;

  try {
    juicyKills = await getRecentJuicyKills({ region, limit: 5 });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load juicy kills";
  }

  if (error) {
    return (
      <PageSection
        title="Recent Juicy Kills"
        description="Top 5 highest fame kills in the last 7 days"
        titleClassName="text-2xl font-semibold tracking-tight"
      >
        <div className="alert-danger rounded-md p-4 text-sm">
          Juicy kills temporarily unavailable.
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection
      title="Recent Juicy Kills"
      description="Top 5 highest fame kills in the last 7 days"
      titleClassName="text-2xl font-semibold tracking-tight"
      actions={
        <Link
          href={appendFeedRegionToHref("/leaderboards", region, { tab: "kills" })}
          className="text-sm text-primary hover:underline"
        >
          View all
        </Link>
      }
    >
      {juicyKills.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No juicy kills in the last 7 days
        </div>
      ) : (
        <div className="space-y-2 stagger-children">
          {juicyKills.map((event) => (
            <KillCard
              key={`${event.region}-${event.eventId}`}
              event={event}
              compact
              compactSize="large"
            />
          ))}
        </div>
      )}
    </PageSection>
  );
}

export function JuicyKillsFallback() {
  return (
    <PageSection
      title="Recent Juicy Kills"
      description="Top 5 highest fame kills in the last 7 days"
      titleClassName="text-2xl font-semibold tracking-tight"
    >
      <div className="space-y-2" aria-busy="true" aria-label="Loading juicy kills">
        {Array.from({ length: 3 }).map((_, i) => (
          <KillCardSkeleton key={i} />
        ))}
      </div>
    </PageSection>
  );
}

export async function TopKillersSection({
  region,
}: {
  region: AlbionRegion | "all";
}) {
  let topKillers: Awaited<ReturnType<typeof getTopKillers>> = [];
  let error: string | null = null;

  try {
    topKillers = await getTopKillers({ region, limit: 10, days: 7 });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load top killers";
  }

  if (error) {
    return (
      <PageSection
        title="Top Killers by Kill Count"
        description="Top 10 most PvP kills in the last 7 days"
        titleClassName="text-2xl font-semibold tracking-tight"
      >
        <div className="alert-danger rounded-md p-4 text-sm">
          Top killers temporarily unavailable.
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection
      title="Top Killers by Kill Count"
      description="Top 10 most PvP kills in the last 7 days"
      titleClassName="text-2xl font-semibold tracking-tight"
      actions={
        <Link
          href={appendFeedRegionToHref("/leaderboards", region, {
            tab: "killers",
          })}
          className="text-sm text-primary hover:underline"
        >
          View all
        </Link>
      }
    >
      <TopKillersList killers={topKillers} />
    </PageSection>
  );
}

export function TopKillersFallback() {
  return (
    <PageSection
      title="Top Killers by Kill Count"
      description="Top 10 most PvP kills in the last 7 days"
      titleClassName="text-2xl font-semibold tracking-tight"
    >
      <div className="space-y-2" aria-busy="true" aria-label="Loading top killers">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
    </PageSection>
  );
}

export async function RecentKillsSection({
  region,
  contentType,
  filterRegions,
}: {
  region: AlbionRegion | "all";
  contentType: ContentTypeFilter;
  filterRegions: FilterRegion[];
}) {
  let feedKills: Awaited<ReturnType<typeof getKillFeed>> = [];
  let error: string | null = null;

  try {
    feedKills = await getKillFeed({
      region,
      contentType,
      limit: FEED_PAGE_SIZE,
      offset: 0,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load kill feed";
  }

  if (error) {
    return (
      <PageSection
        title="Recent Kills"
        description="Latest kills from the local database"
        titleClassName="text-2xl font-semibold tracking-tight"
      >
        <div className="alert-danger rounded-md p-4 text-sm">
          Kill feed temporarily unavailable.
        </div>
      </PageSection>
    );
  }

  if (feedKills.length === 0) {
    return (
      <PageSection
        title="Recent Kills"
        description="Latest kills from the local database"
        titleClassName="text-2xl font-semibold tracking-tight"
      >
        <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
          <p className="font-medium text-foreground">No kills to show yet</p>
          <p className="mt-2 text-sm">
            Fresh Albion kills will appear here as they are ingested. Check back
            soon, or{" "}
            <Link
              href="/search"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              search for a player or guild
            </Link>
            .
          </p>
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection
      title="Recent Kills"
      description="Latest kills from the local database"
      titleClassName="text-2xl font-semibold tracking-tight"
    >
      <Suspense fallback={<FilterChipSkeleton count={4} />}>
        <KillFeedFilters regions={filterRegions} show="contentTypes" />
      </Suspense>
      <KillFeedList
        key={`${region}-${contentType}`}
        initialEvents={feedKills}
        region={region}
        contentType={contentType}
        pageSize={FEED_PAGE_SIZE}
      />
    </PageSection>
  );
}

export function RecentKillsFallback({
  filterRegions,
}: {
  filterRegions: FilterRegion[];
}) {
  return (
    <PageSection
      title="Recent Kills"
      description="Latest kills from the local database"
      titleClassName="text-2xl font-semibold tracking-tight"
    >
      <div className="space-y-3" aria-busy="true" aria-label="Loading recent kills">
        <FilterChipSkeleton count={4} />
        {Array.from({ length: 5 }).map((_, i) => (
          <KillCardSkeleton key={i} />
        ))}
      </div>
    </PageSection>
  );
}
