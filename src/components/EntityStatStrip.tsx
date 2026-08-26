import { StatValue, type StatVariant } from "@/components/StatValue";
import { cn } from "@/lib/utils";

export interface EntityStat {
  label: string;
  mobileLabel?: string;
  value: string;
  variant?: StatVariant;
}

interface EntityStatStripProps {
  stats: EntityStat[];
  className?: string;
}

/** Responsive entity stat panel used on profile/guild/battle headers. */
export function EntityStatStrip({ stats, className }: EntityStatStripProps) {
  const cols =
    stats.length <= 2
      ? "grid-cols-2"
      : stats.length === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-3";

  return (
    <div
      className={cn(
        "grid gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:gap-3 sm:p-4",
        cols,
        className
      )}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
            {stat.mobileLabel ? (
              <>
                <span className="sm:hidden">{stat.mobileLabel}</span>
                <span className="hidden sm:inline">{stat.label}</span>
              </>
            ) : (
              stat.label
            )}
          </p>
          <StatValue
            value={stat.value}
            variant={stat.variant ?? "neutral"}
            size="header"
            className="mt-1"
          />
        </div>
      ))}
    </div>
  );
}
