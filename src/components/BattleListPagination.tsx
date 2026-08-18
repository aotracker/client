"use client";

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
  const buttonClassName =
    "inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {knownTotal
          ? `Showing ${rangeStart}–${rangeEnd} of ${totalItems}`
          : `Showing ${rangeStart}–${rangeStart + pageSize - 1}`}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={buttonClassName}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="px-2 text-sm text-muted-foreground">
          {knownTotal ? `Page ${page} of ${totalPages}` : `Page ${page}`}
        </span>
        <button
          type="button"
          className={buttonClassName}
          disabled={knownTotal ? page >= totalPages : !hasMore}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
