import { Suspense } from "react";
import type { Metadata } from "next";
import { KillFeedFilters } from "@/components/KillFeedFilters";
import {
  JuicyKillsFallback,
  JuicyKillsSection,
  RecentKillsFallback,
  RecentKillsSection,
  TopKillersFallback,
  TopKillersSection,
} from "@/components/home/HomeFeedSections";
import {
  ENABLED_REGIONS,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";
import { regionLabel } from "@/lib/utils";
import { JsonLd, websiteJsonLd } from "@/components/JsonLd";
import { FilterChipSkeleton } from "@/components/ui/skeleton";
import { buildPageMetadata, DEFAULT_DESCRIPTION, HOME_PAGE_TITLE } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";
import type { ContentTypeFilter } from "@/lib/db/queries";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: HOME_PAGE_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalPath: "/",
  }),
  title: {
    absolute: `${SITE_NAME} — ${HOME_PAGE_TITLE}`,
  },
};

const CONTENT_TYPES = new Set<ContentTypeFilter>(["all", "SOLO", "GROUP", "ZVZ"]);

interface HomeProps {
  searchParams: Promise<{ region?: string; type?: string }>;
}

function parseContentType(value: string | undefined): ContentTypeFilter {
  if (value && CONTENT_TYPES.has(value as ContentTypeFilter)) {
    return value as ContentTypeFilter;
  }
  return "all";
}

export default async function HomePage({ searchParams }: HomeProps) {
  const params = await searchParams;
  const requested = params.region ?? "all";
  const region: AlbionRegion | "all" =
    requested === "all" || !isRegionEnabled(requested) ? "all" : requested;
  const contentType = parseContentType(params.type);

  const filterRegions: { value: AlbionRegion | "all"; label: string }[] = [
    { value: "all", label: "All Regions" },
    ...ENABLED_REGIONS.map((r) => ({ value: r, label: regionLabel(r) })),
  ];

  return (
    <div className="space-y-6">
      <JsonLd data={websiteJsonLd()} />
      <h1 className="sr-only">{SITE_NAME} — {HOME_PAGE_TITLE}</h1>

      <Suspense fallback={<FilterChipSkeleton count={4} />}>
        <KillFeedFilters regions={filterRegions} show="regions" />
      </Suspense>

      <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-2">
        <Suspense fallback={<JuicyKillsFallback />}>
          <JuicyKillsSection region={region} />
        </Suspense>
        <Suspense fallback={<TopKillersFallback />}>
          <TopKillersSection region={region} />
        </Suspense>
      </div>

      <Suspense
        fallback={<RecentKillsFallback filterRegions={filterRegions} />}
      >
        <RecentKillsSection
          region={region}
          contentType={contentType}
          filterRegions={filterRegions}
        />
      </Suspense>
    </div>
  );
}
