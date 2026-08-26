"use client";

import { Button } from "@/components/ui/button";

export const BATTLE_LIST_PAGE_SIZE = 10;

interface BattleListPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number | null;
  hasMore?: boolean;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export function BattleListPagination({
  page,
  totalPages,
  totalItems,
  hasMore = false,
  pageSize = BATTLE_LIST_PAGE_SIZE,
  onPageChange,
}: BattleListPaginationProps) {
  const knownTotal = totalItems != null;
  if (knownTotal && totalItems <= pageSize) return null;
  if (!knownTotal && page === 1 && !hasMore) return null;

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = knownTotal
    ? Math.min(page * pageSize, totalItems)
    : page * pageSize;

  return (
    <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {knownTotal
          ? `Showing ${rangeStart}–${rangeEnd} of ${totalItems}`
          : `Showing ${rangeStart}–${rangeStart + pageSize - 1}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="px-2 text-sm text-muted-foreground">
          {knownTotal ? `Page ${page} of ${totalPages}` : `Page ${page}`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={knownTotal ? page >= totalPages : !hasMore}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
