import { FilterChipSkeleton, Skeleton } from "@/components/ui/skeleton";
import { PageSection } from "@/components/PageSection";

export default function BuildsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading builds">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <FilterChipSkeleton count={4} />
      <PageSection title="Meta builds">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </PageSection>
    </div>
  );
}
