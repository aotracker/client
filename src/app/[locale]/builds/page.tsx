import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ region?: string; days?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: BuildsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const search = await searchParams;
  const region = parseFeedRegion(search.region);
  const t = await getTranslations({ locale, namespace: "Builds" });

  return buildFeedPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonicalPath: "/builds",
    region,
    locale,
  });
}

function parseDays(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(Math.max(Math.round(parsed), 1), 30);
}

export default async function BuildsPage({
  params,
  searchParams,
}: BuildsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Builds");
  const tCommon = await getTranslations("Common");

  const search = await searchParams;
  const region = parseFeedRegion(search.region);
  const days = parseDays(search.days);
  const filterRegions = feedRegionFilterOptions();

  let data: Awaited<ReturnType<typeof getMetaBuilds>> | null = null;
  let error: string | null = null;

  try {
    data = await getMetaBuilds({ region, days });
  } catch (e) {
    error = e instanceof Error ? e.message : t("failedLoad");
  }

  const regionSuffix =
    region === "all"
      ? tCommon("labels.allRegionsLower")
      : regionLabel(region);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription", { days, region: regionSuffix })}
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
