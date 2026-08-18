import { BackLink } from "@/components/BackLink";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function KillDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading kill details">
      <BackLink />
      <Card className="overflow-hidden border-border/60">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <PlayerColumnSkeleton />
          <div className="flex flex-col items-center border-y border-border bg-muted/10 px-5 py-5 lg:min-w-[12.5rem] lg:border-x lg:border-y-0 lg:px-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-1 h-3 w-24" />
            <Skeleton className="mt-8 h-3 w-16" />
            <Skeleton className="mt-2 h-8 w-20" />
            <Skeleton className="mt-3 h-5 w-14 rounded-full" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
          <PlayerColumnSkeleton />
        </div>
      </Card>
    </div>
  );
}

function PlayerColumnSkeleton() {
  return (
    <div className="flex flex-col items-center px-4 py-5 sm:px-5">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="mt-2 h-6 w-32" />
      <Skeleton className="mt-1 h-4 w-20" />
      <Skeleton className="mt-1.5 h-4 w-28" />
      <Skeleton className="mt-3 aspect-[480/520] w-full max-w-[240px] rounded-lg sm:max-w-[280px]" />
    </div>
  );
}
