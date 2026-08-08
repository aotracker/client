import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export function FilterChipSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-md" />
      ))}
    </div>
  );
}

export function KillCardSkeleton({
  compactSize = "large",
}: {
  compactSize?: "default" | "large";
}) {
  const large = compactSize === "large";
  const icon = large ? "h-11 w-11 sm:h-16 sm:w-16" : "h-9 w-9";

  return (
    <Card className="border-border/60">
      <div className={cn("flex flex-col", large ? "gap-3 p-3 sm:p-4" : "gap-2 p-3")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-12 rounded" />
            <Skeleton className={cn("h-4", large ? "w-24" : "w-20")} />
          </div>
          <Skeleton className="h-3 w-28" />
        </div>

        <div
          className={cn(
            "flex flex-col gap-2 border-t border-border/40 pt-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center",
            large ? "sm:gap-2 sm:pt-3" : "sm:gap-1.5"
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className={cn("shrink-0 rounded", icon)} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="mx-auto hidden h-3 w-10 sm:block" />
          <div className="flex min-w-0 items-center gap-2 sm:justify-end">
            <Skeleton className={cn("shrink-0 rounded sm:order-2", icon)} />
            <div className="min-w-0 flex-1 space-y-1.5 sm:text-right">
              <Skeleton className="h-4 w-24 sm:ml-auto" />
              <Skeleton className="h-3 w-16 sm:ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function BattleCardSkeleton() {
  return (
    <Card className="border-border/60">
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-3 w-3/4 max-w-xs" />
        <Skeleton className="h-3 w-1/2 max-w-[12rem]" />
      </div>
    </Card>
  );
}

export function EntityHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-16" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}
