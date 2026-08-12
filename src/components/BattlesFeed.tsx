"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BattleCard } from "@/components/BattleCard";
import { BattleListPagination } from "@/components/BattleListPagination";
import { Button } from "@/components/ui/button";
import type { AlbionRegion } from "@/lib/albion/types";
import type { BattlesFeedItem } from "@/lib/db/queries";
import {
  BATTLES_FEED_PAGE_SIZE,
  MAX_COMBINED_BATTLES,
} from "@/lib/battles-constants";
import { scoreRelatedBattles, type ScoredBattle } from "@/lib/battles/related";
import { formatFame, regionLabel } from "@/lib/utils";
import { RelativeTime } from "@/components/RelativeTime";

export { BATTLES_FEED_PAGE_SIZE, MAX_COMBINED_BATTLES };

function selectionKey(region: AlbionRegion, id: number): string {
  return `${region}:${id}`;
}

interface BattlesFeedProps {
  initialBattles: BattlesFeedItem[];
  initialTotal: number;
  region: AlbionRegion | "all";
  searchQuery?: string;
  pageSize?: number;
}

export function BattlesFeed({
  initialBattles,
  initialTotal,
  region,
  searchQuery,
  pageSize = BATTLES_FEED_PAGE_SIZE,
}: BattlesFeedProps) {
  const t = useTranslations("Battle");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [battles, setBattles] = useState(initialBattles);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, BattlesFeedItem>>(
    () => new Map()
  );
  const [apiSuggestions, setApiSuggestions] = useState<ScoredBattle[]>([]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setBattles(initialBattles);
    setTotal(initialTotal);
    setPage(1);
    setError(null);
  }, [initialBattles, initialTotal, region, searchQuery]);

  const loadPage = useCallback(
    async (nextPage: number) => {
      if (loading) return;
      setLoading(true);
      setError(null);

      try {
        const offset = (nextPage - 1) * pageSize;
        const params = new URLSearchParams({
          limit: String(pageSize),
          offset: String(offset),
        });
        if (region !== "all") params.set("region", region);
        if (searchQuery) params.set("q", searchQuery);

        const res = await fetch(`/api/battles?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(t("feed.failedLoad"));
        }

        const data = (await res.json()) as {
          battles?: BattlesFeedItem[];
          total?: number;
        };
        setBattles(data.battles ?? []);
        setTotal(data.total ?? 0);
        setPage(nextPage);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("feed.failedLoad"));
      } finally {
        setLoading(false);
      }
    },
    [loading, pageSize, region, searchQuery, t]
  );

  const selectedCount = selected.size;
  const atLimit = selectedCount >= MAX_COMBINED_BATTLES;
  const selectedList = useMemo(
    () => Array.from(selected.values()),
    [selected]
  );
  const selectedRegion = selectedList[0]?.region ?? null;

  const localSuggestions = useMemo(() => {
    if (selectedList.length === 0) return [];
    return scoreRelatedBattles(selectedList, battles, { limit: 3 });
  }, [battles, selectedList]);

  useEffect(() => {
    if (selectedList.length === 0 || !selectedRegion) {
      setApiSuggestions([]);
      return;
    }

    let cancelled = false;
    const ids = selectedList.map((b) => b.id).join(",");
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          region: selectedRegion,
          ids,
          limit: "5",
        });
        const res = await fetch(`/api/battles/related?${params}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { battles?: ScoredBattle[] };
        if (!cancelled) setApiSuggestions(data.battles ?? []);
      } catch {
        if (!cancelled) setApiSuggestions([]);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedList, selectedRegion]);

  const suggestions = useMemo(() => {
    const byKey = new Map<string, ScoredBattle>();
    for (const s of [...localSuggestions, ...apiSuggestions]) {
      const key = selectionKey(s.region, s.id);
      if (selected.has(key)) continue;
      const prev = byKey.get(key);
      if (!prev || s.score > prev.score) byKey.set(key, s);
    }
    return Array.from(byKey.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [apiSuggestions, localSuggestions, selected]);

  function toggleSelect(battle: BattlesFeedItem, next: boolean) {
    setSelected((prev) => {
      const key = selectionKey(battle.region, battle.id);
      const copy = new Map(prev);
      if (next) {
        if (copy.size >= MAX_COMBINED_BATTLES && !copy.has(key)) return prev;
        const first = copy.values().next().value as BattlesFeedItem | undefined;
        if (first && first.region !== battle.region) return prev;
        copy.set(key, battle);
      } else {
        copy.delete(key);
      }
      return copy;
    });
  }

  function clearSelection() {
    setSelected(new Map());
  }

  function combineSelected() {
    if (selected.size < 2) return;
    const ids = Array.from(selected.keys()).join(",");
    router.push(`/battles/combined?ids=${encodeURIComponent(ids)}`);
  }

  function addSuggestion(battle: BattlesFeedItem) {
    toggleSelect(battle, true);
  }

  function addAllSuggestions() {
    for (const s of suggestions) {
      if (selected.size >= MAX_COMBINED_BATTLES) break;
      toggleSelect(s, true);
    }
  }

  const emptyMessage = useMemo(() => {
    if (searchQuery) {
      return t("feed.emptySearch", { query: searchQuery });
    }
    if (region === "all") return t("feed.emptyAll");
    return t("feed.emptyRegion", { region: regionLabel(region) });
  }, [region, searchQuery, t]);

  if (error && battles.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
        {error}
      </div>
    );
  }

  if (battles.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const roomForSuggestions =
    selectedCount > 0 && selectedCount < MAX_COMBINED_BATTLES;

  return (
    <div className="space-y-4">
      {selectedCount > 0 && (
        <div className="sticky top-[57px] z-40 space-y-3 rounded-md border border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t("feed.selected", { count: selectedCount })}
              {selectedRegion ? ` · ${regionLabel(selectedRegion)}` : ""}
              {atLimit
                ? t("feed.maxSelected", { max: MAX_COMBINED_BATTLES })
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={clearSelection}>
                {tCommon("buttons.clear")}
              </Button>
              <Button
                size="sm"
                disabled={selectedCount < 2}
                onClick={combineSelected}
              >
                {t("feed.combine", { count: selectedCount })}
              </Button>
            </div>
          </div>

          {roomForSuggestions && suggestions.length > 0 && (
            <div className="space-y-2 border-t border-border/60 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("feed.suggestedBattles")}
                </p>
                {suggestions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={addAllSuggestions}
                  >
                    {t("feed.addAllSuggestions")}
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={selectionKey(s.region, s.id)}
                    type="button"
                    onClick={() => addSuggestion(s)}
                    className="inline-flex max-w-full flex-col items-start gap-0.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:gap-2"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {t("feed.battleHash", { id: s.id })}
                      {s.overlapGuildName ? ` · ${s.overlapGuildName}` : ""}
                    </span>
                    {s.startTime && (
                      <span className="shrink-0 text-muted-foreground">
                        <RelativeTime date={s.startTime} />
                      </span>
                    )}
                    <span className="shrink-0 text-stat-fame">
                      {formatFame(s.totalFame)}
                    </span>
                    <span className="shrink-0 text-primary">
                      {tCommon("buttons.add")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-danger-foreground">{error}</p>
      )}

      <div className={`space-y-3 ${loading ? "opacity-60" : ""}`}>
        {battles.map((battle) => {
          const key = selectionKey(battle.region, battle.id);
          const isSelected = selected.has(key);
          const regionMismatch =
            selectedRegion != null && selectedRegion !== battle.region;
          return (
            <BattleCard
              key={key}
              battle={battle}
              region={battle.region}
              selectable
              selected={isSelected}
              selectDisabled={atLimit || regionMismatch}
              onSelectChange={(next) => toggleSelect(battle, next)}
              alliances={battle.alliances}
              guilds={battle.guilds}
              allianceCount={battle.allianceCount}
              guildCount={battle.guildCount}
            />
          );
        })}
      </div>

      <BattleListPagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={(next) => {
          void loadPage(next);
        }}
      />
    </div>
  );
}
