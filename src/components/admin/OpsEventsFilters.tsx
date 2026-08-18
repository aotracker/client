"use client";

import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CircleX, Info } from "lucide-react";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { FilterBar, FilterSelect } from "@/components/ui/filter-select";

const SEVERITIES = ["error", "warning", "info"] as const;
const SEVERITY_ICONS: Record<(typeof SEVERITIES)[number], LucideIcon> = {
  error: CircleX,
  warning: AlertTriangle,
  info: Info,
};
const SOURCES = ["worker", "ingest", "api", "job", "scheduler", "discord"] as const;
const WINDOWS = [
  { value: "", label: "All time" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
] as const;

export function OpsEventsFilters({
  current,
}: {
  current: {
    severity?: string;
    source?: string;
    region?: string;
    window?: string;
  };
}) {
  const router = useRouter();

  function href(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...current, ...patch };
    if (merged.severity) params.set("severity", merged.severity);
    if (merged.source) params.set("source", merged.source);
    if (merged.region) params.set("region", merged.region);
    if (merged.window) params.set("window", merged.window);
    const q = params.toString();
    return q ? `/admin/errors?${q}` : "/admin/errors";
  }

  function navigate(patch: Record<string, string | undefined>) {
    router.push(href(patch));
  }

  return (
    <FilterBar>
      <FilterSelect
        label="Severity"
        value={current.severity ?? ""}
        options={[
          { value: "", label: "All" },
          ...SEVERITIES.map((s) => ({
            value: s,
            label: s,
            icon: SEVERITY_ICONS[s],
          })),
        ]}
        onChange={(next) => navigate({ severity: next || undefined })}
      />
      <FilterSelect
        label="Source"
        value={current.source ?? ""}
        options={[
          { value: "", label: "All" },
          ...SOURCES.map((s) => ({ value: s, label: s })),
        ]}
        onChange={(next) => navigate({ source: next || undefined })}
      />
      <FilterSelect
        label="Region"
        value={current.region ?? ""}
        options={[
          { value: "", label: "All" },
          ...ENABLED_REGIONS.map((r) => ({ value: r, label: r })),
        ]}
        onChange={(next) => navigate({ region: next || undefined })}
      />
      <FilterSelect
        label="Window"
        value={current.window ?? ""}
        options={WINDOWS.map((w) => ({ value: w.value, label: w.label }))}
        onChange={(next) => navigate({ window: next || undefined })}
      />
    </FilterBar>
  );
}
