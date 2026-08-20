"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useWatchlist } from "./useWatchlist";

export function WatchlistNavButton({ className }: { className?: string }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { entries, ready } = useWatchlist();
  const count = entries.length;
  const active = pathname.startsWith("/watchlist");
  const filled = ready && count > 0;
  const label =
    count > 0 ? t("watchlistAriaWithCount", { count }) : t("watchlistAria");

  return (
    <Tooltip content={label} side="bottom">
      <Link
        href="/watchlist"
        className={cn(
          "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          active && "bg-accent text-foreground",
          className
        )}
        aria-label={label}
      >
      <Star
        className={cn("h-4 w-4", filled && "fill-primary text-primary")}
        aria-hidden
      />
      {ready && count > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground"
          aria-hidden
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
      </Link>
    </Tooltip>
  );
}
