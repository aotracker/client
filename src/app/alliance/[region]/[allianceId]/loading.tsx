import { EntityHeaderSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AllianceLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading alliance">
      <EntityHeaderSkeleton />
      <Card>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
