import { Suspense } from "react";
import type { Metadata } from "next";
import { BuildsMetaView } from "@/components/builds/BuildsMetaView";
import { BuildsRegionFilters } from "@/components/builds/BuildsRegionFilters";
import { PageHeader } from "@/components/PageSection";
import { FilterChipSkeleton } from "@/components/ui/skeleton";
import { getMetaBuilds } from "@/lib/db/queries";
import {
  feedRegionFilterOptions,
  parseFeedRegion,
} from "@/lib/region-params";
import { regionLabel } from "@/lib/utils";
import { buildFeedPageMetadata } from "@/lib/seo";

interface BuildsPageProps {
  searchParams: Promise<{ region?: string; days?: string }>;
}

export async function generateMetadata({
  searchParams,
}: BuildsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const region = parseFeedRegion(params.region);

  return buildFeedPageMetadata({
    title: "Albion Online Meta Builds for 1v1, Group, and ZVZ content",
    description:
      "Explore top Albion Online builds by content type — 1v1, group, and ZvZ — with kill/death stats, fame, item power, and popular weapons from live kill data.",
    canonicalPath: "/builds",
    region,
  });
}

function parseDays(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(Math.max(Math.round(parsed), 1), 30);
}

export default async function BuildsPage({ searchParams }: BuildsPageProps) {
  const params = await searchParams;
  const region = parseFeedRegion(params.region);
  const days = parseDays(params.days);
  const filterRegions = feedRegionFilterOptions();

  let data: Awaited<ReturnType<typeof getMetaBuilds>> | null = null;
  let error: string | null = null;

  try {
    data = await getMetaBuilds({ region, days });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load builds";
  }

  const regionSuffix =
    region === "all" ? "all regions" : regionLabel(region);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Albion Online Meta Builds"
        description={`Most-used loadouts for 1v1, group, and ZvZ over the last ${days} days (${regionSuffix}) — including supports, tanks, and healers on assists. Same weapons and gear are combined across tiers.`}
      />

      <Suspense fallback={<FilterChipSkeleton count={4} />}>
        <BuildsRegionFilters regions={filterRegions} />
      </Suspense>

      {error ? (
        <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
          {error}
        </div>
      ) : data ? (
        <BuildsMetaView data={data} />
      ) : null}
    </div>
  );
}
