import { EntityHeaderSkeleton, KillCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function GuildLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading guild">
      <EntityHeaderSkeleton />
      <div className="space-y-2">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <KillCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-5 w-36" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
