import { BackLink } from "@/components/BackLink";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BattleDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading battle">
      <BackLink />
      <Card className="border-border/60">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
