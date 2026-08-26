"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import {
  BATTLE_LIST_PAGE_SIZE,
  BattleListPagination,
} from "@/components/BattleListPagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface BattleStatsTableShellProps<T> {
  title: string;
  items: T[];
  searchPlaceholder: string;
  searchAriaLabel: string;
  emptyMessage: string;
  noMatchMessage: (query: string) => string;
  filterItem: (item: T, query: string) => boolean;
  children: (pagedItems: T[]) => ReactNode;
}

export function BattleStatsTableShell<T>({
  title,
  items,
  searchPlaceholder,
  searchAriaLabel,
  emptyMessage,
  noMatchMessage,
  filterItem,
  children,
}: BattleStatsTableShellProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => filterItem(item, query));
  }, [items, search, filterItem]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / BATTLE_LIST_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * BATTLE_LIST_PAGE_SIZE;
  const pagedItems = filteredItems.slice(pageStart, pageStart + BATTLE_LIST_PAGE_SIZE);

  return (
    <section className="min-w-0">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">
            {title} ({items.length})
          </CardTitle>
          <div className="relative w-full sm:w-44">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchAriaLabel}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">{emptyMessage}</p>
          ) : filteredItems.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              {noMatchMessage(search.trim())}
            </p>
          ) : (
            <table className="w-full table-fixed text-sm">{children(pagedItems)}</table>
          )}
        </CardContent>
      </Card>

      {filteredItems.length > BATTLE_LIST_PAGE_SIZE && (
        <BattleListPagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={filteredItems.length}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}

export const battleTableHeaderClass =
  "px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground first:pl-0 last:pr-0 sm:px-3";

export const battleTableHeaderNumericClass =
  "w-12 px-1.5 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground last:pr-0 sm:w-14 sm:px-2";

export const battleTableCellClass = "min-w-0 truncate px-2 py-2.5 first:pl-0 last:pr-0 sm:px-3";

export const battleTableCellNumericClass =
  "w-12 px-1.5 py-2.5 text-right tabular-nums whitespace-nowrap last:pr-0 sm:w-14 sm:px-2";

export const battleTableRowClass =
  "border-b border-border/40 transition-colors hover:bg-muted/30 last:border-0";
