import Link from "next/link";
import { KillCard } from "@/components/KillCard";
import { RecentKillsFeedSection } from "@/components/home/RecentKillsFeedSection";
import { TopKillersList } from "@/components/TopKillersList";
import { TopFameList } from "@/components/leaderboards/TopFameList";
import { PageSection } from "@/components/PageSection";
import {
  getKillFeed,
  getRecentJuicyKills,
  getTopKillers,
  getTopPlayersByKillFame,
  type ContentTypeFilter,
} from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { appendFeedRegionToHref } from "@/lib/region-params";
import { KillCardSkeleton, Skeleton } from "@/components/ui/skeleton";

const HOME_RECENT_LIMIT = 10;
const HOME_JUICY_LIMIT = 10;
const HOME_KILLERS_LIMIT = 10;
const HOME_FAME_LIMIT = 10;

const HOME_SECTION_DESCRIPTIONS = {
  recentKills: "The 10 most recent kills in tracked PvP data",
  juicyKills: "Highest fame kills in the last 7 days",
  topKillers: "Most PvP kills in the last 7 days",
  topFame: "Highest kill fame earned in the last 7 days",
} as const;

export function HomeFeedGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">{children}</div>
  );
}


export async function JuicyKillsSection({
  region,
}: {
  region: AlbionRegion | "all";
}) {
  let juicyKills: Awaited<ReturnType<typeof getRecentJuicyKills>> = [];
  let error: string | null = null;

  try {
    juicyKills = await getRecentJuicyKills({
      region,
      limit: HOME_JUICY_LIMIT,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load juicy kills";
  }

  if (error) {
    return (
      <PageSection
        title="Top 10 Juicy Kills"
        description={HOME_SECTION_DESCRIPTIONS.juicyKills}
      >
        <div className="alert-danger rounded-md p-4 text-sm">
          Juicy kills temporarily unavailable.
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection
      title="Top 10 Juicy Kills"
      description={HOME_SECTION_DESCRIPTIONS.juicyKills}
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
            />
          ))}
        </div>
      )}
    </PageSection>
  );
}

export function JuicyKillsFallback() {
  return (
    <PageSection title="Top 10 Juicy Kills" description={HOME_SECTION_DESCRIPTIONS.juicyKills}>
      <div
        className="space-y-2"
        aria-busy="true"
        aria-label="Loading juicy kills"
      >
        {Array.from({ length: HOME_JUICY_LIMIT }).map((_, i) => (
          <KillCardSkeleton key={i} compactSize="default" />
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
    topKillers = await getTopKillers({
      region,
      limit: HOME_KILLERS_LIMIT,
      days: 7,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load top killers";
  }

  if (error) {
    return (
      <PageSection
        title="Top 10 Killers"
        description={HOME_SECTION_DESCRIPTIONS.topKillers}
      >
        <div className="alert-danger rounded-md p-4 text-sm">
          Top killers temporarily unavailable.
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection
      title="Top 10 Killers"
      description={HOME_SECTION_DESCRIPTIONS.topKillers}
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
      <TopKillersList killers={topKillers} layout="stack" />
    </PageSection>
  );
}

export function TopKillersFallback() {
  return (
    <PageSection title="Top 10 Killers" description={HOME_SECTION_DESCRIPTIONS.topKillers}>
      <div
        className="grid grid-cols-1 gap-2.5"
        aria-busy="true"
        aria-label="Loading top killers"
      >
        {Array.from({ length: HOME_KILLERS_LIMIT }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3"
          >
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    </PageSection>
  );
}

export async function TopFameEarnersSection({
  region,
}: {
  region: AlbionRegion | "all";
}) {
  let topFame: Awaited<ReturnType<typeof getTopPlayersByKillFame>> = [];
  let error: string | null = null;

  try {
    topFame = await getTopPlayersByKillFame({
      region,
      limit: HOME_FAME_LIMIT,
      days: 7,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load top fame earners";
  }

  if (error) {
    return (
      <PageSection
        title="Top 10 Fame Earners"
        description={HOME_SECTION_DESCRIPTIONS.topFame}
      >
        <div className="alert-danger rounded-md p-4 text-sm">
          Top fame earners temporarily unavailable.
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection
      title="Top 10 Fame Earners"
      description={HOME_SECTION_DESCRIPTIONS.topFame}
      actions={
        <Link
          href={appendFeedRegionToHref("/leaderboards", region, { tab: "fame" })}
          className="text-sm text-primary hover:underline"
        >
          View all
        </Link>
      }
    >
      <TopFameList entries={topFame} layout="stack" />
    </PageSection>
  );
}

export function TopFameEarnersFallback() {
  return (
    <PageSection
      title="Top 10 Fame Earners"
      description={HOME_SECTION_DESCRIPTIONS.topFame}
    >
      <div
        className="grid grid-cols-1 gap-2.5"
        aria-busy="true"
        aria-label="Loading top fame earners"
      >
        {Array.from({ length: HOME_FAME_LIMIT }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3"
          >
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
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
}: {
  region: AlbionRegion | "all";
  contentType: ContentTypeFilter;
}) {
  let feedKills: Awaited<ReturnType<typeof getKillFeed>> = [];
  let error: string | null = null;

  try {
    feedKills = await getKillFeed({
      region,
      contentType,
      limit: HOME_RECENT_LIMIT,
      offset: 0,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load kill feed";
  }

  if (error) {
    return (
      <PageSection
        title="Recent Kills (10)"
        description={HOME_SECTION_DESCRIPTIONS.recentKills}
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
        title="Recent Kills (10)"
        description={HOME_SECTION_DESCRIPTIONS.recentKills}
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
    <RecentKillsFeedSection
      title="Recent Kills (10)"
      description={HOME_SECTION_DESCRIPTIONS.recentKills}
      initialEvents={feedKills}
      region={region}
      contentType={contentType}
      pageSize={HOME_RECENT_LIMIT}
    />
  );
}

export function RecentKillsFallback() {
  return (
    <PageSection
      title="Recent Kills (10)"
      description={HOME_SECTION_DESCRIPTIONS.recentKills}
      descriptionActions="Auto-updates every 20s"
    >
      <div
        className="space-y-2"
        aria-busy="true"
        aria-label="Loading recent kills"
      >
        {Array.from({ length: HOME_RECENT_LIMIT }).map((_, i) => (
          <KillCardSkeleton key={i} compactSize="default" />
        ))}
      </div>
    </PageSection>
  );
}
