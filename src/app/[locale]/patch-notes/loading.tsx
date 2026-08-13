import { Skeleton } from "@/components/ui/skeleton";

export default function PatchNotesLoading() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading Albion Online patch notes"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-4 w-64 max-w-full" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
