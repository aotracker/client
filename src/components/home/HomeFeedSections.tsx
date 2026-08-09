import Link from "next/link";
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
import { KillCardSkeleton, Skeleton } from "@/components/ui/skeleton";

const FEED_PAGE_SIZE = 30;
const HOME_JUICY_LIMIT = 10;
const HOME_KILLERS_LIMIT = 10;

const FEED_TITLE_CLASS = "text-2xl font-semibold tracking-tight";

export function HomeHighlightsShell({
  region,
  children,
}: {
  region: AlbionRegion | "all";
  children: React.ReactNode;
}) {
  return (
    <section
      className="space-y-6 border-t border-border pt-8"
      aria-labelledby="home-highlights-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            id="home-highlights-heading"
            className="font-display text-lg font-semibold"
          >
            This week&apos;s highlights
          </h2>
          <p className="text-sm text-muted-foreground">
            Top performers from the last 7 days
          </p>
        </div>
        <Link
          href={appendFeedRegionToHref("/leaderboards", region)}
          className="shrink-0 text-sm text-primary hover:underline"
        >
          View leaderboards
        </Link>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">{children}</div>
    </section>
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
        description="Highest fame kills · Last 7 days"
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
      description="Highest fame kills · Last 7 days"
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
    <PageSection title="Top 10 Juicy Kills" description="Highest fame kills · Last 7 days">
      <div
        className="space-y-2"
        aria-busy="true"
        aria-label="Loading juicy kills"
      >
        {Array.from({ length: HOME_JUICY_LIMIT }).map((_, i) => (
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
        description="Most PvP kills · Last 7 days"
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
      description="Most PvP kills · Last 7 days"
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
    <PageSection title="Top 10 Killers" description="Most PvP kills · Last 7 days">
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
        titleClassName={FEED_TITLE_CLASS}
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
        titleClassName={FEED_TITLE_CLASS}
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
      titleClassName={FEED_TITLE_CLASS}
    >
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

export function RecentKillsFallback() {
  return (
    <PageSection
      title="Recent Kills"
      description="Latest kills from the local database"
      titleClassName={FEED_TITLE_CLASS}
    >
      <div
        className="space-y-2"
        aria-busy="true"
        aria-label="Loading recent kills"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <KillCardSkeleton key={i} />
        ))}
      </div>
    </PageSection>
  );
}
