"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { AlbionRegion } from "@/lib/albion/types";
import { Button } from "@/components/ui/button";

interface BuildsRegionFiltersProps {
  regions: { value: AlbionRegion | "all"; label: string }[];
}

export function BuildsRegionFilters({ regions }: BuildsRegionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const region = searchParams.get("region") ?? "all";

  function updateRegion(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") {
      params.delete("region");
    } else {
      params.set("region", next);
    }
    const query = params.toString();
    router.push(query ? `/builds?${query}` : "/builds");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {regions.map((r) => (
        <Button
          key={r.value}
          variant={region === r.value ? "default" : "outline"}
          size="sm"
          aria-pressed={region === r.value}
          onClick={() => updateRegion(r.value)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}
