import {
  BuildMetaCardSkeleton,
  FilterChipSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CONTENT_SECTIONS = [
  {
    accent: "bg-solo",
    tint: "from-solo/15 via-transparent to-transparent",
  },
  {
    accent: "bg-group",
    tint: "from-group/15 via-transparent to-transparent",
  },
  {
    accent: "bg-zvz",
    tint: "from-zvz/15 via-transparent to-transparent",
  },
] as const;

function HottestWeaponSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
      <Skeleton className="mt-0.5 h-4 w-5 shrink-0" />
      <Skeleton className="size-14 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-4 w-28 max-w-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export default function BuildsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading builds">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <FilterChipSkeleton count={1} />

      <div className="space-y-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/70 bg-gradient-to-br from-muted/40 to-transparent px-4 py-3"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-8 w-20" />
              <Skeleton className="mt-1.5 h-3 w-32 max-w-full" />
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/70">
          <div className="flex h-1.5 bg-muted">
            {CONTENT_SECTIONS.map((section) => (
              <div key={section.accent} className={cn("w-1/3", section.accent)} />
            ))}
          </div>
          <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {CONTENT_SECTIONS.map((section) => (
              <div key={section.accent} className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("size-2 shrink-0 rounded-full", section.accent)}
                  />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="ml-auto h-4 w-8" />
                </div>
                <Skeleton className="mt-1 ml-4 h-3 w-24" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <HottestWeaponSkeleton key={i} />
            ))}
          </div>
        </div>

        {CONTENT_SECTIONS.map((section) => (
          <section
            key={section.accent}
            className={cn(
              "space-y-4 rounded-xl border border-border/60 bg-gradient-to-r p-4 sm:p-5",
              section.tint
            )}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
              <Skeleton className="h-3 w-24 shrink-0" />
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <BuildMetaCardSkeleton
                  key={i}
                  accentClassName={section.accent}
                />
              ))}
            </div>
          </section>
        ))}

        <Skeleton className="mx-auto h-3 w-full max-w-2xl" />
      </div>
    </div>
  );
}
