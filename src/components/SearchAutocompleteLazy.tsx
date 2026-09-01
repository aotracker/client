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
        <div className={cn("relative min-w-0 flex-1", compact && "sm:max-w-none")}>
          <Search
            className="absolute left-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground sm:block"
            aria-hidden
          />
          <Input
            className="pr-10 sm:pl-9 sm:pr-24"
            placeholder={t("placeholder")}
            aria-label={tCommon("a11y.searchPlayersOrGuilds")}
            readOnly
            tabIndex={-1}
          />
          <Button
            type="button"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 sm:px-3"
            disabled
            aria-label={tCommon("buttons.search")}
          >
            <Search className="h-4 w-4 sm:hidden" aria-hidden />
            <span className="hidden sm:inline">{tCommon("buttons.search")}</span>
          </Button>
        </div>
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
  showSubmitButton?: boolean;
  className?: string;
  onNavigate?: () => void;
}

export function SearchAutocompleteLazy({
  region,
  compact,
  showSubmitButton,
  className,
  onNavigate,
}: SearchAutocompleteLazyProps) {
  return (
    <SearchAutocomplete
      region={region}
      compact={compact}
      showSubmitButton={showSubmitButton}
      className={className}
      onNavigate={onNavigate}
    />
  );
}
