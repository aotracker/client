import { BackLink } from "@/components/BackLink";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function KillDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading kill details">
      <BackLink />
      <Card className="border-border/60">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="space-y-2 text-center">
              <Skeleton className="mx-auto h-5 w-16" />
              <Skeleton className="mx-auto h-4 w-24" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}
