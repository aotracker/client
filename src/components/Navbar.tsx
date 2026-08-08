"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Menu, Moon, Star, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SearchAutocomplete,
  useSearchRegion,
} from "@/components/SearchAutocomplete";
import { useTheme } from "@/components/ThemeProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { WatchlistNavButton } from "@/components/watchlist/WatchlistNavButton";
import type { AlbionRegion } from "@/lib/albion/types";
import { cn } from "@/lib/utils";

interface NavbarProps {
  regions: AlbionRegion[];
}

function formatUtcClock(date: Date): string {
  const time = date.toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${time} UTC`;
}

function subscribeToClock(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(id);
}

function getClockSnapshot() {
  return formatUtcClock(new Date());
}

function ServerTime({ compact = false }: { compact?: boolean }) {
  const clock = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    () => "--:--:-- UTC"
  );

  if (compact) {
    return (
      <p
        className="text-xs tabular-nums text-muted-foreground"
        suppressHydrationWarning
      >
        Server time · {clock}
      </p>
    );
  }

  return (
    <p
      className="hidden shrink-0 text-right text-xs tabular-nums text-muted-foreground md:block"
      suppressHydrationWarning
      title="Albion server time (UTC)"
    >
      <span className="text-foreground/80">Server time</span> · {clock}
    </p>
  );
}

function ThemeToggleButton({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const label =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn("px-2", className)}
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

export function Navbar({ regions }: NavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [region, setRegion] = useSearchRegion(regions[0]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3">
        <BrandLogo />

        <nav className="hidden shrink-0 items-center gap-3 sm:flex">
          <Link
            href="/battles"
            className={cn(
              "rounded-sm text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              pathname.startsWith("/battles")
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            Battles
          </Link>
          <Link
            href="/leaderboards"
            className={cn(
              "rounded-sm text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              pathname.startsWith("/leaderboards")
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            Leaderboards
          </Link>
          <Link
            href="/builds"
            className={cn(
              "rounded-sm text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              pathname.startsWith("/builds")
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            Builds
          </Link>
        </nav>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SearchAutocomplete
            region={region}
            onRegionResolved={setRegion}
            compact
            className="min-w-0 flex-1"
            onNavigate={() => setMenuOpen(false)}
          />
        </div>

        <ServerTime />

        <WatchlistNavButton className="hidden sm:inline-flex" />

        <ThemeToggleButton className="hidden sm:inline-flex" />

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="px-2 sm:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {menuOpen && (
        <div className="border-t border-border px-4 py-3 sm:hidden">
          <nav className="flex flex-col gap-3">
            <Link
              href="/"
              className="rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/battles"
              className="rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setMenuOpen(false)}
            >
              Battles
            </Link>
            <Link
              href="/leaderboards"
              className="rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setMenuOpen(false)}
            >
              Leaderboards
            </Link>
            <Link
              href="/builds"
              className="rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setMenuOpen(false)}
            >
              Builds
            </Link>
            <Link
              href="/watchlist"
              className="flex items-center gap-1.5 rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setMenuOpen(false)}
            >
              <Star className="h-4 w-4" aria-hidden />
              Watchlist
            </Link>
            <Link
              href="/search"
              className="rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setMenuOpen(false)}
            >
              Search
            </Link>
            <div className="flex items-center justify-between gap-3">
              <ServerTime compact />
              <div className="flex items-center gap-2">
                <WatchlistNavButton />
                <ThemeToggleButton />
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
