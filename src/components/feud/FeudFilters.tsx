"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FilterBar, FilterSelect } from "@/components/ui/filter-select";
import {
  FEUD_DAYS_OPTIONS,
  type FeudDaysFilter,
} from "@/lib/feud/params";

function buildFeudHref(
  pathname: string,
  searchParams: URLSearchParams,
  updates: Record<string, string | undefined>
) {
  const params = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (!value || (key === "days" && value === "7")) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  if ("days" in updates || "offset" in updates) {
    params.delete("offset");
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function FeudFilters({ days }: { days: FeudDaysFilter }) {
  const tFilters = useTranslations("Filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const options = FEUD_DAYS_OPTIONS.map((value) => ({
    value: String(value),
    label: tFilters("lastDays", { days: value }),
  }));

  return (
    <FilterBar>
      <FilterSelect
        label={tFilters("period")}
        aria-label={tFilters("period")}
        value={String(days)}
        disabled={isPending}
        options={options}
        onChange={(value) => {
          startTransition(() => {
            router.push(
              buildFeudHref(pathname, searchParams, {
                days: value === "7" ? undefined : value,
              })
            );
          });
        }}
      />
    </FilterBar>
  );
}
