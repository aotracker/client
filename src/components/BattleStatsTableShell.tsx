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
    <section>
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">{children(pagedItems)}</table>
            </div>
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
  "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pl-0 last:pr-0";

export const battleTableHeaderNumericClass =
  "px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground last:pr-0";

export const battleTableCellClass = "px-3 py-2.5 first:pl-0 last:pr-0";

export const battleTableCellNumericClass =
  "px-3 py-2.5 text-right tabular-nums last:pr-0";

export const battleTableRowClass =
  "border-b border-border/40 transition-colors hover:bg-muted/30 last:border-0";
