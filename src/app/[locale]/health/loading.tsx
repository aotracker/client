import { ENABLED_REGIONS } from "@/lib/albion/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function HealthRegionCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="size-3 rounded-full" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
        <div className="my-2 border-t border-border/50" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function HealthLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading health">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {ENABLED_REGIONS.map((region) => (
          <HealthRegionCardSkeleton key={region} />
        ))}
      </div>
    </div>
  );
}
