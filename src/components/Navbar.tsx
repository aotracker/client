"use client";

import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Hammer,
  Home,
  Menu,
  Search,
  Skull,
  Swords,
  Trophy,
  X,
} from "lucide-react";
import { SearchAutocompleteLazy } from "@/components/SearchAutocompleteLazy";
import {
  NavbarRegionSelector,
  useActiveFeedRegion,
} from "@/components/NavbarRegionIndicator";
import { BrandLogo } from "@/components/BrandLogo";
import { UserMenu } from "@/components/UserMenu";
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

interface FeedNavHrefs {
  home: string;
  kills: string;
  battles: string;
  leaderboards: string;
  builds: string;
}

function buildFeedNavHrefs(activeRegion: FeedRegion): FeedNavHrefs {
  return {
    home: appendFeedRegionToHref("/", activeRegion),
    kills: appendFeedRegionToHref("/kills", activeRegion),
    battles: appendFeedRegionToHref("/battles", activeRegion),
    leaderboards: appendFeedRegionToHref("/leaderboards", activeRegion),
    builds: appendFeedRegionToHref("/builds", activeRegion),
  };
}

const DESKTOP_LINKS = [
  { key: "leaderboards" as const, icon: Trophy, match: "/leaderboards" },
  { key: "kills" as const, icon: Skull, match: "/kills" },
  { key: "battles" as const, icon: Swords, match: "/battles" },
  { key: "builds" as const, icon: Hammer, match: "/builds" },
];

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
      <BrandLogo
        href={hrefs.home}
        markOnly
        className="sm:hidden"
      />
      <BrandLogo href={hrefs.home} className="hidden sm:inline-flex" />

      <nav
        className="hidden shrink-0 items-center gap-0.5 md:flex"
        aria-label={t("primaryNav")}
      >
        {DESKTOP_LINKS.map(({ key, icon: Icon, match }) => {
          const active = pathname.startsWith(match);
          return (
            <Link
              key={key}
              href={hrefs[key]}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="hidden h-3.5 w-3.5 shrink-0 lg:block" aria-hidden />
              {t(key)}
            </Link>
          );
        })}
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
  const pathname = usePathname();
  const hrefs = buildFeedNavHrefs(useActiveFeedRegion(preferredRegion));

  const links = [
    { key: "home" as const, href: hrefs.home, icon: Home, match: null },
    ...DESKTOP_LINKS.map(({ key, icon, match }) => ({
      key,
      href: hrefs[key],
      icon,
      match,
    })),
  ];

  return (
    <div className="flex flex-col gap-0.5">
      {links.map(({ key, href, icon: Icon, match }) => {
        const active =
          match === null
            ? pathname === "/" || pathname === ""
            : pathname.startsWith(match);
        return (
          <Link
            key={key}
            href={href}
            className={cn(
              "inline-flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
            onClick={onNavigate}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {t(key)}
          </Link>
        );
      })}
    </div>
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
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Suspense fallback={<BrandLogo href={fallbackHomeHref} />}>
          <NavbarBrandAndDesktopNav
            preferredRegion={navRegion}
            pathname={pathname}
          />
        </Suspense>

        <div className="flex min-w-0 flex-1 justify-center sm:justify-end md:justify-center">
          <SearchAutocompleteLazy
            region={navRegion ?? "all"}
            compact
            showSubmitButton={false}
            className="w-full min-w-0 max-w-md"
            onNavigate={closeMenu}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Suspense fallback={null}>
            <NavbarRegionSelector
              regions={regions}
              preferredRegion={navRegion}
              onRegionChange={setNavRegion}
              className="hidden sm:block"
            />
          </Suspense>

          <div className="hidden sm:block">
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          </div>

          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
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
        <div className="border-t border-border px-3 py-3 sm:px-4 md:hidden">
          <nav className="flex flex-col gap-4" aria-label={t("primaryNav")}>
            <div className="sm:hidden">
              <Suspense fallback={null}>
                <NavbarRegionSelector
                  regions={regions}
                  preferredRegion={navRegion}
                  variant="chips"
                  onSelect={closeMenu}
                  onRegionChange={setNavRegion}
                />
              </Suspense>
            </div>

            <Suspense fallback={null}>
              <NavbarMobileFeedLinks
                preferredRegion={navRegion}
                onNavigate={closeMenu}
              />
            </Suspense>

            <div className="flex flex-col gap-0.5 border-t border-border pt-3 sm:hidden">
              <Link
                href="/search"
                className="inline-flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={closeMenu}
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden />
                {t("search")}
              </Link>
            </div>

            <div className="border-t border-border pt-3 sm:hidden">
              <Suspense fallback={null}>
                <UserMenu variant="panel" onNavigate={closeMenu} />
              </Suspense>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
