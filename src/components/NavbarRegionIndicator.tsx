"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";
import type { AlbionRegion } from "@/lib/albion/types";
import {
  buildFeedHref,
  feedRegionFilterOptions,
  isFeedPath,
  readFeedRegionParam,
  rememberFeedRegionSelection,
  type FeedRegion,
} from "@/lib/region-params";
import { Button } from "@/components/ui/button";
import { cn, regionLabel } from "@/lib/utils";

interface NavbarRegionSelectorProps {
  regions: AlbionRegion[];
  preferredRegion: AlbionRegion | null;
  onRegionChange?: (region: AlbionRegion) => void;
  onSelect?: () => void;
  variant?: "dropdown" | "chips";
  className?: string;
}

export function useActiveFeedRegion(
  preferredRegion: AlbionRegion | null
): FeedRegion {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  if (isFeedPath(pathname)) {
    return readFeedRegionParam(searchParams);
  }

  return preferredRegion ?? "all";
}

function regionOptionLabel(region: FeedRegion): string {
  return region === "all" ? "All Regions" : regionLabel(region);
}

export function NavbarRegionSelector({
  regions,
  preferredRegion,
  onRegionChange,
  onSelect,
  variant = "dropdown",
  className,
}: NavbarRegionSelectorProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const activeRegion = useActiveFeedRegion(preferredRegion);

  const options = feedRegionFilterOptions().filter(
    (option) => option.value === "all" || regions.includes(option.value)
  );

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function selectRegion(next: FeedRegion) {
    setOpen(false);

    if (next !== "all") {
      rememberFeedRegionSelection(next);
      onRegionChange?.(next);
    }

    if (isFeedPath(pathname)) {
      router.push(
        buildFeedHref(pathname, searchParams, { region: next, offset: null })
      );
      onSelect?.();
      return;
    }

    if (next === "all") {
      router.push(buildFeedHref("/", new URLSearchParams(), { region: "all" }));
      onSelect?.();
      return;
    }

    router.refresh();

    onSelect?.();
  }

  if (variant === "chips") {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Region
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={activeRegion === option.value ? "default" : "outline"}
              aria-pressed={activeRegion === option.value}
              onClick={() => selectRegion(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("relative hidden shrink-0 sm:block", className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 px-2.5"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="max-w-[6.5rem] truncate">
          {regionOptionLabel(activeRegion)}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </Button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Select region"
          className="absolute right-0 top-[calc(100%+0.375rem)] z-50 min-w-[11rem] overflow-hidden rounded-md border border-border bg-card p-1 shadow-lg"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Server region
          </p>
          {options.map((option) => {
            const selected = activeRegion === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selected
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
                onClick={() => selectRegion(option.value)}
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    selected ? "text-primary opacity-100" : "opacity-0"
                  )}
                  aria-hidden
                />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** @deprecated Use NavbarRegionSelector */
export const NavbarRegionIndicator = NavbarRegionSelector;

/** @deprecated Use NavbarRegionSelector with variant="chips" */
export function NavbarRegionLabel(props: NavbarRegionSelectorProps) {
  return <NavbarRegionSelector {...props} variant="chips" />;
}
