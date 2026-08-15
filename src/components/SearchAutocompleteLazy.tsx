"use client";

import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PreferredRegion } from "@/lib/region-preference";

function NavbarSearchChrome({
  compact,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("Search");
  const tCommon = useTranslations("Common");

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex w-full items-center gap-2">
        <div className={cn("relative min-w-0 flex-1", compact && "max-w-56")}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("placeholder")}
            aria-label={tCommon("a11y.searchPlayersOrGuilds")}
            readOnly
            tabIndex={-1}
          />
        </div>
        <Button type="button" size="sm" className="hidden sm:inline-flex" disabled>
          {tCommon("buttons.search")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="px-2 sm:hidden"
          disabled
          aria-label={tCommon("buttons.search")}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const SearchAutocomplete = dynamic(
  () =>
    import("@/components/SearchAutocomplete").then(
      (mod) => mod.SearchAutocomplete
    ),
  {
    ssr: false,
    loading: () => (
      <NavbarSearchChrome compact className="min-w-0 flex-1" />
    ),
  }
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
  return (
    <SearchAutocomplete
      region={region}
      compact={compact}
      className={className}
      onNavigate={onNavigate}
    />
  );
}
