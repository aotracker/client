import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  BattlesFeedFallback,
  BattlesFeedSection,
} from "@/components/BattlesFeedSection";
import { BattlesFilters } from "@/components/BattlesFilters";
import { PageHeader } from "@/components/PageSection";
import { RelativeTime } from "@/components/RelativeTime";
import { parseBattlesMinPlayers } from "@/lib/battles-constants";
import { getCronJobStatuses } from "@/lib/jobs/cron-state";
import { feedRegionFilterOptions } from "@/lib/region-params";
import { resolveServerFeedRegion } from "@/lib/region-preference-server";
import { buildFeedPageMetadata } from "@/lib/seo";
import { FilterChipSkeleton } from "@/components/ui/skeleton";

interface BattlesPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ region?: string; q?: string; minPlayers?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: BattlesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const search = await searchParams;
  const region = await resolveServerFeedRegion(search.region);
  const t = await getTranslations({ locale, namespace: "Battle" });

  return buildFeedPageMetadata({
    title: t("pageTitle"),
    description: t("pageDescription"),
    canonicalPath: "/battles",
    region,
    locale,
  });
}

async function BattlesListUpdatedLabel() {
  const t = await getTranslations("Battle");
  const cronStatus = await getCronJobStatuses().catch(() => null);
  const lastListUpdatedAt =
    cronStatus?.jobs.find((job) => job.jobKey === "ingest")?.lastSuccessAt ??
    null;
  if (!lastListUpdatedAt) return null;
  return (
    <p className="text-xs text-muted-foreground sm:pt-1 sm:text-right">
      {t("listUpdated", { time: "" }).trimEnd()}{" "}
      <RelativeTime date={lastListUpdatedAt} />
    </p>
  );
}

export default async function BattlesPage({
  params,
  searchParams,
}: BattlesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Battle");

  const search = await searchParams;
  const region = await resolveServerFeedRegion(search.region);
  const q = search.q?.trim() || undefined;
  const minPlayers = parseBattlesMinPlayers(search.minPlayers);
  const filterRegions = feedRegionFilterOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        actions={
          <Suspense fallback={null}>
            <BattlesListUpdatedLabel />
          </Suspense>
        }
      />

      <Suspense fallback={<FilterChipSkeleton count={2} />}>
        <BattlesFilters regions={filterRegions} activeRegion={region} />
      </Suspense>

      <Suspense fallback={<BattlesFeedFallback />}>
        <BattlesFeedSection region={region} q={q} minPlayers={minPlayers} />
      </Suspense>
    </div>
  );
}
