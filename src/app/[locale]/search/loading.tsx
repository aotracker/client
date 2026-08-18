import { FilterChipSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function SearchLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading search">
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-xl" />
        <FilterChipSkeleton count={1} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-16 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
