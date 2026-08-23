"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { BrandMark } from "@/components/BrandLogo";
import { UserMenu } from "@/components/UserMenu";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";
import { AdminNav } from "./AdminNav";

function AdminTopBar({ showNav = true }: { showNav?: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:gap-4 sm:px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark className="size-8" title={SITE_NAME} />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-sm font-semibold tracking-tight">
              {SITE_NAME}
              <span className="ml-2 font-sans text-xs font-medium normal-case tracking-normal text-muted-foreground">
                Admin
              </span>
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Operator console
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium",
              "text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            )}
          >
            <Home className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <Suspense
            fallback={
              <span
                className="h-8 w-8 animate-pulse rounded-full bg-muted"
                aria-hidden
              />
            }
          >
            <UserMenu />
          </Suspense>
        </div>
      </div>

      {showNav ? (
        <div className="border-t border-border lg:hidden">
          <div className="mx-auto max-w-7xl px-3 sm:px-4">
            <AdminNav orientation="horizontal" />
          </div>
        </div>
      ) : null}
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
