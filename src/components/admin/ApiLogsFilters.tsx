"use client";

import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Check, CircleDashed, X } from "lucide-react";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { FilterBar, FilterSelect } from "@/components/ui/filter-select";

const STATUSES = ["success", "error", "miss"] as const;
const STATUS_ICONS: Record<(typeof STATUSES)[number], LucideIcon> = {
  success: Check,
  error: X,
  miss: CircleDashed,
};
const WINDOWS = [
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
] as const;

export function ApiLogsFilters({
  current,
}: {
  current: {
    status?: string;
    region?: string;
    window?: string;
    endpoint?: string;
  };
}) {
  const router = useRouter();

  function href(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...current, ...patch };
    if (merged.status) params.set("status", merged.status);
    if (merged.region) params.set("region", merged.region);
    if (merged.window) params.set("window", merged.window);
    if (merged.endpoint) params.set("endpoint", merged.endpoint);
    const q = params.toString();
    return q ? `/admin/api-logs?${q}` : "/admin/api-logs";
  }

  function navigate(patch: Record<string, string | undefined>) {
    router.push(href(patch));
  }

  return (
    <FilterBar>
      <FilterSelect
        label="Status"
        value={current.status ?? ""}
        options={[
          { value: "", label: "All" },
          ...STATUSES.map((s) => ({
            value: s,
            label: s,
            icon: STATUS_ICONS[s],
          })),
        ]}
        onChange={(next) => navigate({ status: next || undefined })}
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
        value={current.window ?? "1h"}
        options={WINDOWS.map((w) => ({ value: w.value, label: w.label }))}
        onChange={(next) => navigate({ window: next })}
      />
    </FilterBar>
  );
}
