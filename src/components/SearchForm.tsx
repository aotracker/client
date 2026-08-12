"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SearchAutocomplete,
  useSearchRegion,
} from "@/components/SearchAutocomplete";
import type { AlbionRegion } from "@/lib/albion/types";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { regionLabel } from "@/lib/utils";
import { getRecentSearches } from "@/lib/search/recent-searches";
import { Link } from "@/i18n/navigation";
import type { RecentSearch } from "@/lib/search/recent-searches";

interface SearchFormProps {
  initialQuery?: string;
  initialRegion?: AlbionRegion;
  /** Pass from a Server Component so region buttons match SSR (avoids client env drift). */
  regions?: AlbionRegion[];
}

export function SearchForm({
  initialQuery = "",
  initialRegion,
  regions = ENABLED_REGIONS,
}: SearchFormProps) {
  const t = useTranslations("Search");
  const [region, setRegion] = useSearchRegion(
    initialRegion ?? regions[0] ?? "americas",
    { preferStored: initialRegion == null }
  );
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  useEffect(() => {
    if (initialRegion) setRegion(initialRegion);
  }, [initialRegion, setRegion]);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  return (
    <div className="space-y-3">
      <SearchAutocomplete
        region={region}
        onRegionResolved={setRegion}
        initialQuery={initialQuery}
        autoFocus={!initialQuery}
        showSubmitButton
      />
      <div className="flex flex-wrap gap-2">
        {regions.map((r) => (
          <Button
            key={r}
            type="button"
            size="sm"
            variant={region === r ? "default" : "outline"}
            aria-pressed={region === r}
            onClick={() => setRegion(r)}
          >
            {regionLabel(r)}
          </Button>
        ))}
      </div>
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
                    <Clock className="h-3 w-3 shrink-0" aria-hidden />
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
