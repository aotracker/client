import Link from "next/link";
import { ENABLED_REGIONS } from "@/lib/albion/types";

const STATUSES = ["success", "error", "miss"] as const;
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <FilterGroup label="Status">
          <FilterLink href={href({ status: undefined })} active={!current.status}>
            All
          </FilterLink>
          {STATUSES.map((s) => (
            <FilterLink
              key={s}
              href={href({ status: s })}
              active={current.status === s}
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
              key={w.value}
              href={href({ window: w.value })}
              active={(current.window ?? "1h") === w.value}
            >
              {w.label}
            </FilterLink>
          ))}
        </FilterGroup>
      </div>
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
