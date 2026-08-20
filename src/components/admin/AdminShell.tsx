"use client";

import Link from "next/link";
import { Home, Monitor, Moon, Sun } from "lucide-react";
import { BrandMark } from "@/components/BrandLogo";
import { Tooltip } from "@/components/ui/tooltip";
import { useTheme } from "@/components/ThemeProvider";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";
import { AdminNav } from "./AdminNav";

function AdminThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label =
    theme === "system"
      ? "Switch to light theme"
      : theme === "light"
        ? "Switch to dark theme"
        : "Switch to system theme";

  return (
    <Tooltip content={label} side="bottom">
      <button
        type="button"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={label}
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
    </Tooltip>
  );
}

function AdminTopBar({ showNav = true }: { showNav?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark className="size-8" title={SITE_NAME} />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-sm font-semibold tracking-tight">
              {SITE_NAME}
              <span className="ml-2 text-muted-foreground font-sans text-xs font-medium normal-case tracking-normal">
                Admin
              </span>
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Operator console
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <AdminThemeToggle />
          <Link
            href="/"
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium",
              "text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            )}
          >
            <Home className="h-4 w-4" aria-hidden />
            <span>Home</span>
          </Link>
        </div>
      </div>

      {showNav && (
        <div className="border-t border-border/60 lg:hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <AdminNav orientation="horizontal" />
          </div>
        </div>
      )}
    </header>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopBar />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-20 space-y-3">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Navigate
            </p>
            <AdminNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-10">{children}</main>
      </div>
    </div>
  );
}

/** Minimal chrome for the unauthenticated admin gate. */
export function AdminGateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminTopBar showNav={false} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
