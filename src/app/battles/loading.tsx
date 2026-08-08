import {
  BattleCardSkeleton,
  FilterChipSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function BattlesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading battles">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <FilterChipSkeleton count={4} />
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <BattleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
