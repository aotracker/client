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
import type { ContentTypeFilter } from "@/lib/db/queries";
import {
  feedRegionFilterOptions,
  parseFeedRegion,
} from "@/lib/region-params";
import { JsonLd, websiteJsonLd } from "@/components/JsonLd";
import { FilterChipSkeleton } from "@/components/ui/skeleton";
import { buildFeedPageMetadata, buildPageMetadata, DEFAULT_DESCRIPTION, feedPageDescription, feedPageTitle, HOME_PAGE_TITLE } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

interface HomeProps {
  searchParams: Promise<{ region?: string; type?: string }>;
}

export async function generateMetadata({
  searchParams,
}: HomeProps): Promise<Metadata> {
  const params = await searchParams;
  const region = parseFeedRegion(params.region);
  const title = feedPageTitle(HOME_PAGE_TITLE, region);
  const description = feedPageDescription(DEFAULT_DESCRIPTION, region);

  return {
    ...buildPageMetadata({
      title,
      description,
      canonicalPath: "/",
    }),
    title: {
      absolute: `${SITE_NAME} — ${title}`,
    },
  };
}

const CONTENT_TYPES = new Set<ContentTypeFilter>(["all", "SOLO", "GROUP", "ZVZ"]);

function parseContentType(value: string | undefined): ContentTypeFilter {
  if (value && CONTENT_TYPES.has(value as ContentTypeFilter)) {
    return value as ContentTypeFilter;
  }
  return "all";
}

export default async function HomePage({ searchParams }: HomeProps) {
  const params = await searchParams;
  const region = parseFeedRegion(params.region);
  const contentType = parseContentType(params.type);
  const filterRegions = feedRegionFilterOptions();

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
