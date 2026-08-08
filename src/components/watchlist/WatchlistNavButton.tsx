"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWatchlist } from "./useWatchlist";

export function WatchlistNavButton({ className }: { className?: string }) {
  const pathname = usePathname();
  const { entries, ready } = useWatchlist();
  const count = entries.length;
  const active = pathname.startsWith("/watchlist");
  const filled = ready && count > 0;

  return (
    <Link
      href="/watchlist"
      className={cn(
        "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-transparent transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active && "bg-accent",
        className
      )}
      aria-label={count > 0 ? `Watchlist (${count})` : "Watchlist"}
      title="Watchlist"
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
  );
}
