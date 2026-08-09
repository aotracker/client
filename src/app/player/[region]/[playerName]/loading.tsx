import { EntityHeaderSkeleton } from "@/components/ui/skeleton";

export default function PlayerLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading player">
      <EntityHeaderSkeleton />
    </div>
  );
}
