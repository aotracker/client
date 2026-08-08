import { Suspense } from "react";
import type { Metadata } from "next";
import { BuildsMetaView } from "@/components/builds/BuildsMetaView";
import { BuildsRegionFilters } from "@/components/builds/BuildsRegionFilters";
import { PageHeader } from "@/components/PageSection";
import { FilterChipSkeleton } from "@/components/ui/skeleton";
import { getMetaBuilds } from "@/lib/db/queries";
import {
  ENABLED_REGIONS,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";
import { regionLabel } from "@/lib/utils";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Albion Online Meta Builds for 1v1, Group, and ZVZ content",
  description:
    "Explore top Albion Online builds by content type — 1v1, group, and ZvZ — with kill/death stats, fame, item power, and popular weapons from live kill data.",
  canonicalPath: "/builds",
});

interface BuildsPageProps {
  searchParams: Promise<{ region?: string; days?: string }>;
}

function parseDays(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(Math.max(Math.round(parsed), 1), 30);
}

export default async function BuildsPage({ searchParams }: BuildsPageProps) {
  const params = await searchParams;
  const requested = params.region ?? "all";
  const region: AlbionRegion | "all" =
    requested === "all" || !isRegionEnabled(requested) ? "all" : requested;
  const days = parseDays(params.days);

  const filterRegions: { value: AlbionRegion | "all"; label: string }[] = [
    { value: "all", label: "All Regions" },
    ...ENABLED_REGIONS.map((r) => ({ value: r, label: regionLabel(r) })),
  ];

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
