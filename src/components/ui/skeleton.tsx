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

export function FilterChipSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-wrap items-end gap-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="min-w-[9.5rem] space-y-1.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function KillCardSkeleton({
  compactSize = "large",
  home = false,
}: {
  compactSize?: "default" | "large";
  home?: boolean;
}) {
  if (home) {
    return (
      <Card className="border-border/60">
        <div className="flex flex-col gap-1.5 p-3">
          <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-3.5 w-12" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-5 w-12 rounded" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Skeleton className="size-10 shrink-0 rounded" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-3 w-10 shrink-0" />
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Skeleton className="size-10 shrink-0 rounded" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const large = compactSize === "large";
  const icon = large ? "h-11 w-11 sm:h-16 sm:w-16" : "size-8";

  return (
    <Card className="border-border/60">
      <div className={cn("flex flex-col", large ? "gap-3 p-3 sm:p-4" : "gap-2 p-3")}>
        <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2">
          <div className="flex items-center gap-3">
            <Skeleton className={cn("h-4", large ? "w-20" : "w-16")} />
            <Skeleton className={cn("h-4", large ? "w-16" : "w-14")} />
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-12 rounded" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center",
            large ? "sm:gap-2" : "sm:gap-1.5"
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

export function BuildMetaCardSkeleton({
  accentClassName,
}: {
  accentClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/70 bg-card/80 p-4"
      )}
    >
      {accentClassName ? (
        <div
          className={cn("absolute inset-y-0 left-0 w-1", accentClassName)}
          aria-hidden
        />
      ) : null}

      <div className="flex flex-col gap-3 pl-2">
        <div className="flex items-start gap-3">
          <Skeleton className="size-8 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-4 w-36 max-w-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="size-16 rounded-md" />
          ))}
        </div>

        <div className="grid grid-cols-3 divide-x divide-y divide-border/60 rounded-md border border-border/50 bg-muted/20 sm:grid-cols-6 sm:divide-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-1 py-2 sm:px-2">
              <Skeleton className="mx-auto h-2.5 w-8" />
              <Skeleton className="mx-auto mt-1.5 h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
