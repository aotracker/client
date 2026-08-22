import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { KillFeedFilters } from "@/components/KillFeedFilters";
import {
  HomeFeedGrid,
  JuicyKillsFallback,
  JuicyKillsSection,
  RecentKillsFallback,
  RecentKillsSection,
  TopKillersFallback,
  TopKillersSection,
  TopFameEarnersFallback,
  TopFameEarnersSection,
} from "@/components/home/HomeFeedSections";
import type { ContentTypeFilter } from "@/lib/db/queries";
import { feedRegionFilterOptions } from "@/lib/region-params";
import { resolveServerFeedRegion } from "@/lib/region-preference-server";
import { JsonLd, websiteJsonLd } from "@/components/JsonLd";
import { FilterChipSkeleton } from "@/components/ui/skeleton";
import { buildPageMetadata } from "@/lib/seo";
import { translatedRegionLabel } from "@/lib/seo-metadata";
import { SITE_NAME } from "@/lib/site";

interface HomeProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ region?: string; type?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: HomeProps): Promise<Metadata> {
  const { locale } = await params;
  const search = await searchParams;
  const region = await resolveServerFeedRegion(search.region);
  const tSeo = await getTranslations({ locale, namespace: "Seo" });

  const baseTitle = tSeo("homePageTitle");
  const baseDescription = tSeo("defaultDescription");
  const regionName =
    region === "all" ? "" : await translatedRegionLabel(region, locale);
  const title =
    region === "all"
      ? baseTitle
      : tSeo("feedRegionSuffix", { title: baseTitle, region: regionName });
  const description =
    region === "all"
      ? baseDescription
      : tSeo("feedRegionDescription", {
          description: baseDescription,
          region: regionName,
        });

  return {
    ...buildPageMetadata({
      title,
      description,
      canonicalPath: "/",
      locale,
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

export default async function HomePage({ params, searchParams }: HomeProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const search = await searchParams;
  const region = await resolveServerFeedRegion(search.region);
  const contentType = parseContentType(search.type);
  const filterRegions = feedRegionFilterOptions();
  const t = await getTranslations("Home");
  const tSeo = await getTranslations("Seo");

  return (
    <div className="space-y-6">
      <JsonLd
        data={websiteJsonLd({
          locale,
          description: tSeo("defaultDescription"),
        })}
      />
      <h1 className="sr-only">
        {t("srOnlyTitle", {
          siteName: SITE_NAME,
          pageTitle: tSeo("homePageTitle"),
        })}
      </h1>

      <Suspense fallback={<FilterChipSkeleton count={2} />}>
        <KillFeedFilters
          regions={filterRegions}
          activeRegion={region}
          show="all"
        />
      </Suspense>

      <HomeFeedGrid>
        <Suspense fallback={<RecentKillsFallback />}>
          <RecentKillsSection region={region} contentType={contentType} />
        </Suspense>
        <Suspense fallback={<JuicyKillsFallback />}>
          <JuicyKillsSection region={region} />
        </Suspense>
        <Suspense fallback={<TopKillersFallback />}>
          <TopKillersSection region={region} />
        </Suspense>
        <Suspense fallback={<TopFameEarnersFallback />}>
          <TopFameEarnersSection region={region} />
        </Suspense>
      </HomeFeedGrid>
    </div>
  );
}
