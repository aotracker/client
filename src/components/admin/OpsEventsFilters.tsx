import Link from "next/link";
import { ENABLED_REGIONS } from "@/lib/albion/types";

const SEVERITIES = ["error", "warning", "info"] as const;
const SOURCES = ["worker", "ingest", "api", "job", "scheduler"] as const;
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

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <FilterGroup label="Severity">
        <FilterLink href={href({ severity: undefined })} active={!current.severity}>
          All
        </FilterLink>
        {SEVERITIES.map((s) => (
          <FilterLink
            key={s}
            href={href({ severity: s })}
            active={current.severity === s}
          >
            {s}
          </FilterLink>
        ))}
      </FilterGroup>
      <FilterGroup label="Source">
        <FilterLink href={href({ source: undefined })} active={!current.source}>
          All
        </FilterLink>
        {SOURCES.map((s) => (
          <FilterLink
            key={s}
            href={href({ source: s })}
            active={current.source === s}
          >
            {s}
          </FilterLink>
        ))}
      </FilterGroup>
      <FilterGroup label="Region">
        <FilterLink href={href({ region: undefined })} active={!current.region}>
          All
        </FilterLink>
        {ENABLED_REGIONS.map((r) => (
          <FilterLink
            key={r}
            href={href({ region: r })}
            active={current.region === r}
          >
            {r}
          </FilterLink>
        ))}
      </FilterGroup>
      <FilterGroup label="Window">
        {WINDOWS.map((w) => (
          <FilterLink
            key={w.value || "all"}
            href={href({ window: w.value || undefined })}
            active={(current.window ?? "") === w.value}
          >
            {w.label}
          </FilterLink>
        ))}
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-border/50 px-2 py-1">
      <span className="text-xs text-muted-foreground">{label}:</span>
      {children}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded px-2 py-0.5 text-xs font-medium bg-primary/15 text-primary"
          : "rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
      }
    >
      {children}
    </Link>
  );
}
