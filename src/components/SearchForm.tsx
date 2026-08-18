"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import {
  SearchAutocomplete,
  useSearchRegion,
} from "@/components/SearchAutocomplete";
import type { AlbionRegion } from "@/lib/albion/types";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { feedRegionFilterOptions } from "@/lib/region-params";
import type { PreferredRegion } from "@/lib/region-preference";
import { getRecentSearches } from "@/lib/search/recent-searches";
import { Link } from "@/i18n/navigation";
import type { RecentSearch } from "@/lib/search/recent-searches";

interface SearchFormProps {
  initialQuery?: string;
  initialRegion?: PreferredRegion;
  /** Pass from a Server Component so region options match SSR (avoids client env drift). */
  regions?: AlbionRegion[];
}

export function SearchForm({
  initialQuery = "",
  initialRegion,
  regions = ENABLED_REGIONS,
}: SearchFormProps) {
  const t = useTranslations("Search");
  const tRegions = useTranslations("Common.regions");
  const tFilters = useTranslations("Filters");
  const [region, setRegion] = useSearchRegion(initialRegion ?? "all", {
    preferStored: initialRegion == null,
  });
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const regionOptions = feedRegionFilterOptions().filter(
    (option) => option.value === "all" || regions.includes(option.value)
  );

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  return (
    <div className="space-y-3">
      <SearchAutocomplete
        region={region}
        initialQuery={initialQuery}
        autoFocus={!initialQuery}
        showSubmitButton
      />
      <FilterSelect
        label={tFilters("region")}
        value={region}
        options={regionOptions.map((r) => ({
          value: r.value,
          label: tRegions.has(r.value) ? tRegions(r.value) : r.label,
        }))}
        onChange={setRegion}
      />
      {!initialQuery && recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("recentSearches")}
          </p>
          <ul className="flex flex-wrap gap-2">
            {recent.map((item) => {
              const href = item.path
                ? item.path
                : `/search?q=${encodeURIComponent(item.q)}&region=${item.region}`;
              return (
                <li key={`${item.ts}-${item.q}-${item.path ?? ""}`}>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {item.path ?? item.q}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
