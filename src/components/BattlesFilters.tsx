"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { AlbionRegion } from "@/lib/albion/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BattlesFiltersProps {
  regions: { value: AlbionRegion | "all"; label: string }[];
}

export function BattlesFilters({ regions }: BattlesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const region = searchParams.get("region") ?? "all";
  const qParam = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(qParam);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  function pushParams(updates: { region?: string; q?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.region !== undefined) {
      if (updates.region === "all") {
        params.delete("region");
      } else {
        params.set("region", updates.region);
      }
    }

    if (updates.q !== undefined) {
      const next = updates.q?.trim() ?? "";
      if (!next) {
        params.delete("q");
      } else {
        params.set("q", next);
      }
    }

    const queryString = params.toString();
    router.push(queryString ? `/battles?${queryString}` : "/battles");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    pushParams({ q: query });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {regions.map((r) => (
          <Button
            key={r.value}
            variant={region === r.value ? "default" : "outline"}
            size="sm"
            aria-pressed={region === r.value}
            onClick={() => pushParams({ region: r.value })}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex w-full max-w-md items-center gap-2">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guild, alliance, or player..."
            className="pl-9"
            aria-label="Search battles by guild, alliance, or player"
          />
        </div>
        <Button type="submit" size="sm">
          Search
        </Button>
        {qParam && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery("");
              pushParams({ q: null });
            }}
          >
            Clear
          </Button>
        )}
      </form>
    </div>
  );
}
