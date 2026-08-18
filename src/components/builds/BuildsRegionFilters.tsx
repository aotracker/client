"use client";

import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { AlbionRegion } from "@/lib/albion/types";
import {
  buildFeedHref,
  readFeedRegionParam,
  rememberFeedRegionSelection,
} from "@/lib/region-params";
import { FilterSelect } from "@/components/ui/filter-select";

interface BuildsRegionFiltersProps {
  regions: { value: AlbionRegion | "all"; label: string }[];
  activeRegion?: AlbionRegion | "all";
}

export function BuildsRegionFilters({
  regions,
  activeRegion = "all",
}: BuildsRegionFiltersProps) {
  const tFilters = useTranslations("Filters");
  const router = useRouter();
  const searchParams = useSearchParams();
  const region = readFeedRegionParam(searchParams, activeRegion);

  function updateRegion(next: string) {
    rememberFeedRegionSelection(next);
    router.push(buildFeedHref("/builds", searchParams, { region: next }));
  }

  return (
    <FilterSelect
      label={tFilters("region")}
      value={region}
      options={regions.map((r) => ({
        value: r.value,
        label: r.label,
      }))}
      onChange={updateRegion}
    />
  );
}
