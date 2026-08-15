"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PreferredRegion } from "@/lib/region-preference";

const SearchAutocomplete = dynamic(
  () =>
    import("@/components/SearchAutocomplete").then(
      (mod) => mod.SearchAutocomplete
    ),
  { ssr: false }
);

interface SearchAutocompleteLazyProps {
  region: PreferredRegion;
  compact?: boolean;
  className?: string;
  onNavigate?: () => void;
}

export function SearchAutocompleteLazy({
  region,
  compact,
  className,
  onNavigate,
}: SearchAutocompleteLazyProps) {
  const [ready, setReady] = useState(false);

  if (!ready) {
    return (
      <div className={cn("relative", className)}>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className={cn("pl-8", compact && "h-8")}
          placeholder="Search…"
          onFocus={() => setReady(true)}
          aria-label="Search"
        />
      </div>
    );
  }

  return (
    <SearchAutocomplete
      region={region}
      compact={compact}
      className={className}
      onNavigate={onNavigate}
      autoFocus
    />
  );
}
