"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type { AlbionRegion } from "@/lib/albion/types";
import {
  BUILD_DAYS,
  parseBuildDays,
  parseMetaBuildRole,
  parseMetaWeapon,
} from "@/lib/builds/params";
import {
  buildFeedHref,
  readFeedRegionParam,
  rememberFeedRegionSelection,
  translatedFeedRegionLabel,
} from "@/lib/region-params";
import { FilterBar, FilterSelect } from "@/components/ui/filter-select";

interface BuildsFiltersProps {
  regions: { value: AlbionRegion | "all"; label: string }[];
  activeRegion?: AlbionRegion | "all";
  activeWeaponLabel?: string | null;
}

export function BuildsFilters({
  regions,
  activeRegion = "all",
  activeWeaponLabel = null,
}: BuildsFiltersProps) {
  const t = useTranslations("Builds");
  const tFilters = useTranslations("Filters");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const region = readFeedRegionParam(searchParams, activeRegion);
  const days = parseBuildDays(searchParams.get("days") ?? undefined);
  const role = parseMetaBuildRole(searchParams.get("role") ?? undefined);
  const weapon = parseMetaWeapon(searchParams.get("weapon") ?? undefined);

  function push(updates: Record<string, string | null>) {
    if (updates.region) {
      rememberFeedRegionSelection(updates.region);
    }
    router.push(buildFeedHref("/builds", searchParams, updates));
  }

  return (
    <FilterBar>
      <FilterSelect
        label={tFilters("region")}
        value={region}
        options={regions.map((r) => ({
          value: r.value,
          label: translatedFeedRegionLabel(tCommon, r.value),
        }))}
        onChange={(next) => push({ region: next })}
      />
      <FilterSelect
        label={tFilters("period")}
        value={String(days)}
        options={BUILD_DAYS.map((d) => ({
          value: String(d),
          label:
            d === 1
              ? t("filters.lastDay")
              : tFilters("lastDays", { days: d }),
        }))}
        onChange={(next) => push({ days: next === "30" ? null : next })}
      />
      <FilterSelect
        label={t("filters.role")}
        value={role}
        options={[
          { value: "all", label: t("filters.allRoles") },
          ...(["dps", "healer", "tank", "support"] as const).map((value) => ({
            value,
            label: tCommon(`labels.weaponRoles.${value}`),
          })),
        ]}
        onChange={(next) => push({ role: next === "all" ? null : next })}
      />
      {weapon ? (
        <div className="flex min-w-0 flex-col">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("filters.weapon")}
          </p>
          <button
            type="button"
            onClick={() => push({ weapon: null })}
            className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t("filters.clearWeapon", {
              weapon: activeWeaponLabel ?? weapon,
            })}
          >
            <span className="min-w-0 truncate">
              {activeWeaponLabel ?? weapon}
            </span>
            <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </div>
      ) : null}
    </FilterBar>
  );
}
