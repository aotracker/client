import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BuildsMetaView } from "@/components/builds/BuildsMetaView";
import { BuildsFilters } from "@/components/builds/BuildsFilters";
import { PageHeader } from "@/components/PageSection";
import { FilterChipSkeleton } from "@/components/ui/skeleton";
import { getMetaBuilds } from "@/lib/db/queries";
import {
  parseBuildDays,
  parseMetaBuildArmor,
  parseMetaBuildRole,
  parseMetaBuildSort,
} from "@/lib/builds/params";
import { resolveMetaWeapon } from "@/lib/builds/resolve-weapon";
import { pickLocalizedName } from "@/lib/items/localized-name";
import { feedRegionFilterOptions } from "@/lib/region-params";
import { resolveServerFeedRegion } from "@/lib/region-preference-server";
import { formatItemName, regionLabel } from "@/lib/utils";
import { buildFeedPageMetadata } from "@/lib/seo-metadata";

interface BuildsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    region?: string;
    days?: string;
    role?: string;
    armor?: string;
    sort?: string;
    weapon?: string;
  }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: BuildsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const search = await searchParams;
  const region = await resolveServerFeedRegion(search.region);
  const t = await getTranslations({ locale, namespace: "Builds" });

  return buildFeedPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    canonicalPath: "/builds",
    region,
    locale,
  });
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
  const region = await resolveServerFeedRegion(search.region);
  const days = parseBuildDays(search.days);
  const role = parseMetaBuildRole(search.role);
  const armor = parseMetaBuildArmor(search.armor);
  const sort = parseMetaBuildSort(search.sort);
  const weapon = resolveMetaWeapon(search.weapon);
  const filterRegions = feedRegionFilterOptions();

  let data: Awaited<ReturnType<typeof getMetaBuilds>> | null = null;
  let error: string | null = null;

  try {
    data = await getMetaBuilds({ region, days, role, armor, sort, weapon });
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

      <Suspense fallback={<FilterChipSkeleton count={3} />}>
        <BuildsFilters
          regions={filterRegions}
          activeRegion={region}
          activeWeaponLabel={
            weapon
              ? pickLocalizedName(
                  data?.topWeapons.find((entry) => entry.familyKey === weapon)
                    ?.familyNames,
                  locale,
                  formatItemName(`T8_${weapon}`)
                )
              : null
          }
        />
      </Suspense>

      {error ? (
        <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
          {error}
        </div>
      ) : data ? (
        <BuildsMetaView data={data} sort={sort} weapon={weapon} />
      ) : null}
    </div>
  );
}
