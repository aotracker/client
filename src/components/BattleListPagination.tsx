"use client";

export const BATTLE_LIST_PAGE_SIZE = 10;

interface BattleListPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export function BattleListPagination({
  page,
  totalPages,
  totalItems,
  pageSize = BATTLE_LIST_PAGE_SIZE,
  onPageChange,
}: BattleListPaginationProps) {
  if (totalItems <= pageSize) return null;

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);
  const buttonClassName =
    "inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50";

  return (
    <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {rangeStart}–{rangeEnd} of {totalItems}
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
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className={buttonClassName}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
