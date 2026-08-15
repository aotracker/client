"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  Hammer,
  Home,
  Menu,
  Monitor,
  Moon,
  Search,
  Star,
  Sun,
  Swords,
  Trophy,
  X,
} from "lucide-react";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import {
  NavbarRegionSelector,
  useActiveFeedRegion,
} from "@/components/NavbarRegionIndicator";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "@/components/ThemeProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { WatchlistNavButton } from "@/components/watchlist/WatchlistNavButton";
import type { AlbionRegion } from "@/lib/albion/types";
import {
  appendFeedRegionToHref,
  feedNavHref,
  type FeedRegion,
} from "@/lib/region-params";
import {
  getStoredPreferredRegion,
  type PreferredRegion,
} from "@/lib/region-preference";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface NavbarProps {
  regions: AlbionRegion[];
  preferredRegion: PreferredRegion | null;
}

const SERVER_CLOCK_PLACEHOLDER = "--:--:--";

function formatUtcClock(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

let cachedClock = formatUtcClock(new Date());

function subscribeToClock(onStoreChange: () => void) {
  const id = window.setInterval(() => {
    const next = formatUtcClock(new Date());
    if (next !== cachedClock) {
      cachedClock = next;
      onStoreChange();
    }
  }, 1000);
  return () => window.clearInterval(id);
}

function getClockSnapshot() {
  return cachedClock;
}

function getServerClockSnapshot() {
  return SERVER_CLOCK_PLACEHOLDER;
}

function ServerTime({ className }: { className?: string }) {
  const t = useTranslations("Nav");
  const clock = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot
  );

  return (
    <p
      className={cn(
        "inline-flex shrink-0 items-center gap-1 tabular-nums text-[11px] leading-none text-muted-foreground",
        className
      )}
      suppressHydrationWarning
      title={t("serverTimeTitle")}
    >
      <Clock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      <span className="sr-only">{t("serverTime")} </span>
      {clock}
      <span className="ml-0.5 opacity-70">UTC</span>
    </p>
  );
}

function ThemeToggleButton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("Nav");
  const { theme, toggleTheme } = useTheme();
  const label =
    theme === "system"
      ? t("themeSwitchToLight")
      : theme === "light"
        ? t("themeSwitchToDark")
        : t("themeSwitchToSystem");

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        compact
          ? "text-muted-foreground hover:bg-accent hover:text-foreground"
          : "border border-border hover:bg-accent",
        className
      )}
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      {theme === "system" ? (
        <Monitor className="h-4 w-4" />
      ) : theme === "light" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

/** Shared border group: clock · watchlist · language · theme */
function NavbarPrefsCluster({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative z-10 hidden h-8 items-center rounded-md border border-border sm:flex",
        className
      )}
    >
      <div className="hidden items-center px-2.5 lg:flex">
        <ServerTime />
      </div>
      <div className="hidden h-full w-px bg-border lg:block" aria-hidden />
      <WatchlistNavButton className="rounded-none border-0" />
      <div className="h-full w-px bg-border" aria-hidden />
      <Suspense fallback={null}>
        <LanguageSelector compact />
      </Suspense>
      <div className="h-full w-px bg-border" aria-hidden />
      <ThemeToggleButton compact />
    </div>
  );
}

interface FeedNavHrefs {
  home: string;
  battles: string;
  leaderboards: string;
  builds: string;
}

function buildFeedNavHrefs(activeRegion: FeedRegion): FeedNavHrefs {
  return {
    home: appendFeedRegionToHref("/", activeRegion),
    battles: appendFeedRegionToHref("/battles", activeRegion),
    leaderboards: appendFeedRegionToHref("/leaderboards", activeRegion),
    builds: appendFeedRegionToHref("/builds", activeRegion),
  };
}

function NavbarBrandAndDesktopNav({
  preferredRegion,
  pathname,
}: {
  preferredRegion: PreferredRegion | null;
  pathname: string;
}) {
  const t = useTranslations("Nav");
  const hrefs = buildFeedNavHrefs(useActiveFeedRegion(preferredRegion));

  return (
    <>
      <BrandLogo href={hrefs.home} />

      <nav className="hidden shrink-0 items-center gap-3 sm:flex">
        <Link
          href={hrefs.leaderboards}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            pathname.startsWith("/leaderboards")
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          <Trophy className="h-4 w-4 shrink-0" aria-hidden />
          {t("leaderboards")}
        </Link>
        <Link
          href={hrefs.battles}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            pathname.startsWith("/battles")
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          <Swords className="h-4 w-4 shrink-0" aria-hidden />
          {t("battles")}
        </Link>
        <Link
          href={hrefs.builds}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            pathname.startsWith("/builds")
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          <Hammer className="h-4 w-4 shrink-0" aria-hidden />
          {t("builds")}
        </Link>
      </nav>
    </>
  );
}

function NavbarMobileFeedLinks({
  preferredRegion,
  onNavigate,
}: {
  preferredRegion: PreferredRegion | null;
  onNavigate: () => void;
}) {
  const t = useTranslations("Nav");
  const hrefs = buildFeedNavHrefs(useActiveFeedRegion(preferredRegion));

  return (
    <>
      <Link
        href={hrefs.home}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={onNavigate}
      >
        <Home className="h-4 w-4 shrink-0" aria-hidden />
        {t("home")}
      </Link>
      <Link
        href={hrefs.leaderboards}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={onNavigate}
      >
        <Trophy className="h-4 w-4 shrink-0" aria-hidden />
        {t("leaderboards")}
      </Link>
      <Link
        href={hrefs.battles}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={onNavigate}
      >
        <Swords className="h-4 w-4 shrink-0" aria-hidden />
        {t("battles")}
      </Link>
      <Link
        href={hrefs.builds}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={onNavigate}
      >
        <Hammer className="h-4 w-4 shrink-0" aria-hidden />
        {t("builds")}
      </Link>
    </>
  );
}

export function Navbar({ regions, preferredRegion }: NavbarProps) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navRegion, setNavRegion] = useState(preferredRegion);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setNavRegion(getStoredPreferredRegion() ?? preferredRegion);
  }, [pathname, preferredRegion]);

  const fallbackHomeHref = feedNavHref("/", navRegion);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-2.5">
        <Suspense fallback={<BrandLogo href={fallbackHomeHref} />}>
          <NavbarBrandAndDesktopNav
            preferredRegion={navRegion}
            pathname={pathname}
          />
        </Suspense>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SearchAutocomplete
            region={navRegion ?? "all"}
            compact
            className="min-w-0 flex-1"
            onNavigate={() => setMenuOpen(false)}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Suspense fallback={null}>
            <NavbarRegionSelector
              regions={regions}
              preferredRegion={navRegion}
              onRegionChange={setNavRegion}
            />
          </Suspense>

          <NavbarPrefsCluster />

          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:hidden"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border px-4 py-3 sm:hidden">
          <nav className="flex flex-col gap-4">
            <Suspense fallback={null}>
              <NavbarRegionSelector
                regions={regions}
                preferredRegion={navRegion}
                variant="chips"
                onSelect={() => setMenuOpen(false)}
                onRegionChange={setNavRegion}
              />
            </Suspense>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("preferences")}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex h-8 flex-1 items-center justify-between rounded-md border border-border px-2.5">
                  <ServerTime />
                  <div className="flex items-center">
                    <Suspense fallback={null}>
                      <LanguageSelector compact />
                    </Suspense>
                    <div className="mx-0.5 h-4 w-px bg-border" aria-hidden />
                    <ThemeToggleButton compact />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Suspense fallback={null}>
                <NavbarMobileFeedLinks
                  preferredRegion={navRegion}
                  onNavigate={() => setMenuOpen(false)}
                />
              </Suspense>
              <Link
                href="/watchlist"
                className="flex items-center gap-1.5 rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setMenuOpen(false)}
              >
                <Star className="h-4 w-4" aria-hidden />
                {t("watchlist")}
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center gap-1.5 rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setMenuOpen(false)}
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden />
                {t("search")}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
