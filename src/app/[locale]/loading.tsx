import { FilterChipSkeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <FilterChipSkeleton count={2} />
    </div>
  );
}
