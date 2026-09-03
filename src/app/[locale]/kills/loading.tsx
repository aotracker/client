import {
  FilterChipSkeleton,
  KillCardSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function KillsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading kills">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="flex flex-col gap-3">
        <FilterChipSkeleton count={3} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-[4.75rem]" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <KillCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
