"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AlbionRegion } from "@/lib/albion/types";
import { getDefaultRegion } from "@/lib/albion/types";
import { cn, regionLabel } from "@/lib/utils";
import { guildPath, playerPath } from "@/lib/seo";
import { parseDeepLink } from "@/lib/search/parse-deep-link";
import {
  getPreferredRegion,
  setPreferredRegion,
} from "@/lib/region-preference";
import {
  getRecentSearches,
  pushRecentSearch,
  type RecentSearch,
} from "@/lib/search/recent-searches";

type SuggestItem = {
  key: string;
  label: string;
  href: string;
  meta?: string;
  badge?: "Cached" | "Live" | "Recent";
  kind: "player" | "guild" | "alliance" | "recent" | "path";
};

function kindLabel(kind: SuggestItem["kind"]): string | null {
  if (kind === "player") return "Player";
  if (kind === "guild") return "Guild";
  if (kind === "alliance") return "Alliance";
  if (kind === "path") return "Link";
  return null;
}

interface SearchAutocompleteProps {
  region: AlbionRegion;
  onRegionResolved?: (region: AlbionRegion) => void;
  initialQuery?: string;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  showSubmitButton?: boolean;
  className?: string;
  onNavigate?: () => void;
}

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

export function SearchAutocomplete({
  region,
  onRegionResolved,
  initialQuery = "",
  placeholder = "Search players or guilds...",
  autoFocus = false,
  compact = false,
  showSubmitButton = true,
  className,
  onNavigate,
}: SearchAutocompleteProps) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const siteOrigin =
    typeof window !== "undefined" ? window.location.origin : undefined;

  const deepLink = useMemo(
    () => parseDeepLink(query, region, siteOrigin),
    [query, region, siteOrigin]
  );

  const recentItems: SuggestItem[] = useMemo(
    () =>
      recent.map((item, i) => {
        const pathKind = item.path?.startsWith("/alliance/")
          ? "alliance"
          : item.path?.startsWith("/guild/")
            ? "guild"
            : item.path?.startsWith("/player/")
              ? "player"
              : null;
        const kind =
          item.type === "alliance" ||
          item.type === "guild" ||
          item.type === "player"
            ? item.type
            : pathKind ?? "recent";

        return {
          key: `recent-${i}-${item.path ?? item.q}`,
          label: item.path ? item.path : item.q,
          href: item.path
            ? item.path
            : `/search?q=${encodeURIComponent(item.q)}&region=${item.region}`,
          meta: item.path ? "Deep link" : regionLabel(item.region),
          badge: "Recent" as const,
          kind,
        };
      }),
    [recent]
  );

  const visibleItems: SuggestItem[] = useMemo(() => {
    if (deepLink) {
      return [
        {
          key: `path-${deepLink.path}`,
          label: deepLink.label,
          href: deepLink.path,
          meta: deepLink.path,
          kind: "path",
        },
      ];
    }
    if (!query.trim()) return recentItems;
    return suggestions;
  }, [deepLink, query, recentItems, suggestions]);

  useEffect(() => {
    const trimmed = query.trim();
    if (deepLink || trimmed.length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          region,
          limit: "8",
        });
        const res = await fetch(`/api/search?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as {
          local?: {
            players?: {
              albionId: string;
              name: string;
              region: string;
              guild?: { name: string } | null;
            }[];
            guilds?: { albionId: string; name: string; region: string }[];
            alliances?: {
              albionId: string;
              name: string;
              tag: string | null;
              region: string;
            }[];
          };
        };

        if (cancelled) return;

        const items: SuggestItem[] = [];
        const seen = new Set<string>();

        for (const p of data.local?.players ?? []) {
          const key = `player-${p.region}-${p.albionId}`;
          seen.add(key);
          items.push({
            key,
            label: p.name,
            href: playerPath(p.region, p.name),
            meta: [regionLabel(p.region), p.guild?.name].filter(Boolean).join(" · "),
            badge: "Cached",
            kind: "player",
          });
        }
        for (const g of data.local?.guilds ?? []) {
          const key = `guild-${g.region}-${g.albionId}`;
          seen.add(key);
          items.push({
            key,
            label: g.name,
            href: guildPath(g.region, g.name),
            meta: regionLabel(g.region),
            badge: "Cached",
            kind: "guild",
          });
        }
        for (const a of data.local?.alliances ?? []) {
          const key = `alliance-${a.region}-${a.albionId}`;
          seen.add(key);
          items.push({
            key,
            label: a.tag ? `[${a.tag}] ${a.name}` : a.name,
            href: `/alliance/${a.region}/${a.albionId}`,
            meta: regionLabel(a.region),
            badge: "Cached",
            kind: "alliance",
          });
        }

        setSuggestions(items.slice(0, 10));
        setActiveIndex(-1);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, region, deepLink]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const navigateTo = useCallback(
    (href: string, recentEntry?: Omit<RecentSearch, "ts">) => {
      if (recentEntry) {
        pushRecentSearch(recentEntry);
        setRecent(getRecentSearches());
      }
      setPreferredRegion(region);
      onRegionResolved?.(region);
      setOpen(false);
      onNavigate?.();
      router.push(href);
    },
    [onNavigate, onRegionResolved, region, router]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (deepLink) {
      navigateTo(deepLink.path, {
        q: trimmed,
        region,
        type: "path",
        path: deepLink.path,
      });
      return;
    }

    if (activeIndex >= 0 && visibleItems[activeIndex]) {
      const item = visibleItems[activeIndex];
      navigateTo(item.href, {
        q: item.kind === "recent" ? trimmed || item.label : item.label,
        region,
        type: item.kind === "guild" ? "guild" : item.kind === "path" ? "path" : "player",
        path: item.href.startsWith("/search") ? undefined : item.href,
      });
      return;
    }

    const params = new URLSearchParams({ q: trimmed, region });
    navigateTo(`/search?${params}`, {
      q: trimmed,
      region,
      type: "query",
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, visibleItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    }
  }

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex items-center gap-2",
          compact ? "w-full" : "w-full"
        )}
      >
        <div className={cn("relative min-w-0 flex-1", compact && "max-w-56")}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="pl-9"
            name="q"
            autoFocus={autoFocus}
            aria-label="Search players or guilds"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={open}
            role="combobox"
          />
        </div>
        {showSubmitButton && (
          <>
            <Button type="submit" size="sm" className="hidden sm:inline-flex">
              Search
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="px-2 sm:hidden"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
          </>
        )}
      </form>

      {open && (visibleItems.length > 0 || loading) && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-card shadow-lg"
        >
          {loading && suggestions.length === 0 && !deepLink && query.trim() && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
          )}
          {!query.trim() && recentItems.length > 0 && (
            <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Recent
            </p>
          )}
          {visibleItems.map((item, index) => (
            <button
              key={item.key}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50",
                index === activeIndex && "bg-accent/50"
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() =>
                navigateTo(item.href, {
                  q: item.kind === "recent" ? item.label : item.label,
                  region,
                  type:
                    item.kind === "guild"
                      ? "guild"
                      : item.kind === "alliance"
                        ? "alliance"
                        : item.kind === "path"
                          ? "path"
                          : item.kind === "recent"
                            ? "query"
                            : "player",
                  path: item.href.startsWith("/search") ? undefined : item.href,
                })
              }
            >
              {item.badge === "Recent" ? (
                <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : null}
              <span className="min-w-0 flex-1 truncate font-medium">
                {item.label}
              </span>
              {kindLabel(item.kind) && (
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {kindLabel(item.kind)}
                </span>
              )}
              {item.meta && (
                <span className="hidden max-w-[7rem] truncate text-xs text-muted-foreground sm:inline">
                  {item.meta}
                </span>
              )}
              {item.badge && item.badge !== "Recent" && (
                <Badge variant={item.badge === "Live" ? "default" : "outline"}>
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Hook helper for navbar region preference. */
export function usePreferredRegion(
  fallback?: AlbionRegion,
  options?: { preferStored?: boolean }
): [AlbionRegion, (region: AlbionRegion) => void] {
  const defaultRegion = fallback ?? getDefaultRegion();
  const preferStored = options?.preferStored ?? true;
  const [region, setRegionState] = useState(defaultRegion);

  useEffect(() => {
    if (!preferStored) return;
    setRegionState(getPreferredRegion(defaultRegion));
  }, [defaultRegion, preferStored]);

  const setRegion = useCallback((next: AlbionRegion) => {
    setRegionState(next);
    setPreferredRegion(next);
  }, []);

  return [region, setRegion];
}

/** @deprecated Use usePreferredRegion */
export const useSearchRegion = usePreferredRegion;
