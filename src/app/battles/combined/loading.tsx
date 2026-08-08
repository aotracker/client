import { BackLink } from "@/components/BackLink";
import { Skeleton } from "@/components/ui/skeleton";

export default function CombinedBattlesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading combined battles">
      <BackLink />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}
