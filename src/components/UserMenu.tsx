"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Star,
  Sun,
  UserRound,
} from "lucide-react";
import NextLink from "next/link";
import { usePathname as useNextPathname } from "next/navigation";
import { LoginButtons } from "@/components/auth/LoginButtons";
import { useTheme, type ThemePreference } from "@/components/ThemeProvider";
import { useWatchlist } from "@/components/watchlist/useWatchlist";
import { LOCALE_DEFINITIONS, type AppLocale } from "@/i18n/locales";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { signOutWithPrefsSnapshot } from "@/lib/auth-prefs";
import { isSocialLoginVisible } from "@/lib/auth-providers";
import { useAuthUser, useHydrated } from "@/components/SessionSnapshotProvider";
import { cn } from "@/lib/utils";

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

const THEME_OPTIONS: {
  value: ThemePreference;
  icon: typeof Sun;
  labelKey: "themeLight" | "themeDark" | "themeSystem";
}[] = [
  { value: "light", icon: Sun, labelKey: "themeLight" },
  { value: "dark", icon: Moon, labelKey: "themeDark" },
  { value: "system", icon: Monitor, labelKey: "themeSystem" },
];

function AccountPanel({
  className,
  onAction,
}: {
  className?: string;
  onAction?: () => void;
}) {
  const tAuth = useTranslations("Auth");
  const tNav = useTranslations("Nav");
  const { user } = useAuthUser();
  const { theme, setTheme } = useTheme();
  const { entries, ready } = useWatchlist();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const nextPathname = useNextPathname();
  const searchParams = useSearchParams();
  const authEnabled = isSocialLoginVisible();
  const clock = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot
  );
  const [providers, setProviders] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const name = user?.name ?? tAuth("account");
  const image = user?.image;
  const watchCount = ready ? entries.length : 0;
  const watchlistActive = pathname.startsWith("/watchlist");
  const accountActive = pathname.startsWith("/account");
  const onAdminRoute = nextPathname.startsWith("/admin");
  const sessionIsAdmin = Boolean(user?.isAdmin);

  useEffect(() => {
    if (!user?.id) {
      setProviders([]);
      setIsAdmin(false);
      return;
    }
    setIsAdmin(sessionIsAdmin);
    let cancelled = false;
    void fetch("/api/user/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          providers?: string[];
          user?: { isAdmin?: boolean };
        };
        if (!cancelled) {
          setProviders(data.providers ?? []);
          setIsAdmin(Boolean(data.user?.isAdmin) || sessionIsAdmin);
        }
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, sessionIsAdmin]);

  function signedInLabel(): string {
    const hasDiscord = providers.includes("discord");
    const hasGoogle = providers.includes("google");
    if (hasDiscord && hasGoogle) return tAuth("signedInWithDiscordAndGoogle");
    if (hasDiscord) return tAuth("signedInWithDiscord");
    if (hasGoogle) return tAuth("signedInWithGoogle");
    return tAuth("signedIn");
  }

  function switchLocale(next: AppLocale) {
    if (next === locale) return;
    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    onAction?.();
    router.replace(href, { locale: next });
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-card",
        className
      )}
    >
      {authEnabled && (
        <div className="border-b border-border px-3 py-2.5">
          {user ? (
            <div className="flex items-center gap-2.5">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full"
                  width={32}
                  height={32}
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {name}
                  </span>
                  {isAdmin ? (
                    <span className="shrink-0 rounded-sm bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                      Admin
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {signedInLabel()}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {tAuth("signIn")}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {tAuth("signInHint")}
                </p>
              </div>
              <LoginButtons
                size="sm"
                callbackURL={
                  onAdminRoute ? nextPathname || "/admin" : pathname || "/"
                }
                className="gap-2"
                onBeforeSignIn={onAction}
              />
            </div>
          )}
        </div>
      )}

      <div className="p-1">
        {user ? (
          <Link
            href="/account"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              accountActive
                ? "bg-primary/10 font-medium text-foreground"
                : "text-foreground hover:bg-accent"
            )}
            onClick={() => onAction?.()}
          >
            <Settings
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="min-w-0 flex-1">{tAuth("account")}</span>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </Link>
        ) : null}
        {user && isAdmin ? (
          <NextLink
            href="/admin"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              onAdminRoute
                ? "bg-primary/10 font-medium text-foreground"
                : "text-foreground hover:bg-accent"
            )}
            onClick={() => onAction?.()}
          >
            <LayoutDashboard
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="min-w-0 flex-1">{tAuth("adminPanel")}</span>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </NextLink>
        ) : null}
        <Link
          href="/watchlist"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            watchlistActive
              ? "bg-primary/10 font-medium text-foreground"
              : "text-foreground hover:bg-accent"
          )}
          onClick={() => onAction?.()}
        >
          <Star
            className={cn(
              "h-4 w-4 shrink-0",
              watchCount > 0 ? "fill-primary text-primary" : "text-muted-foreground"
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1">{tNav("watchlist")}</span>
          {watchCount > 0 ? (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-medium tabular-nums text-primary">
              {watchCount > 99 ? "99+" : watchCount}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {tNav("watchlistEmpty")}
            </span>
          )}
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </Link>
        {!user && authEnabled && watchCount > 0 ? (
          <p className="px-2.5 pb-1.5 pt-0.5 text-xs leading-snug text-muted-foreground">
            {tAuth("watchlistLocalHint")}
          </p>
        ) : null}
      </div>

      <div className="border-t border-border p-1">
        <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {tNav("theme")}
        </p>
        <div className="grid grid-cols-3 gap-0.5 px-1 pb-1">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                className={cn(
                  "inline-flex flex-col items-center gap-1 rounded-md px-1 py-2 text-xs transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selected
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                onClick={() => setTheme(option.value)}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {tNav(option.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {!onAdminRoute ? (
        <div className="border-t border-border p-1">
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {tNav("language")}
          </p>
          {LOCALE_DEFINITIONS.map((def) => {
            const selected = def.code === locale;
            return (
              <button
                key={def.code}
                type="button"
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selected
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                onClick={() => switchLocale(def.code)}
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    selected ? "text-primary opacity-100" : "opacity-0"
                  )}
                  aria-hidden
                />
                <span className="uppercase tabular-nums text-muted-foreground">
                  {def.code}
                </span>
                <span>{def.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <p
          className="inline-flex items-center gap-1.5 tabular-nums text-xs text-muted-foreground"
          title={tNav("serverTimeTitle")}
          suppressHydrationWarning
        >
          <Clock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
          <span className="sr-only">{tNav("serverTime")} </span>
          {clock}
          <span className="opacity-70">UTC</span>
        </p>
        {user ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => {
              onAction?.();
              void signOutWithPrefsSnapshot(user.id);
            }}
          >
            <LogOut className="h-3 w-3 shrink-0" aria-hidden />
            {tAuth("signOut")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function UserMenu({
  className,
  onNavigate,
  variant = "dropdown",
}: {
  className?: string;
  /** Close parent mobile sheet when an action completes. */
  onNavigate?: () => void;
  /** `panel` renders controls inline (mobile sheet); `dropdown` is the compact header control. */
  variant?: "dropdown" | "panel";
}) {
  const tAuth = useTranslations("Auth");
  const tNav = useTranslations("Nav");
  const { user, isPending, hydrated } = useAuthUser();
  const { entries, ready } = useWatchlist();
  const pathname = usePathname();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const authEnabled = isSocialLoginVisible();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (variant === "panel") {
    return <AccountPanel className={className} onAction={onNavigate} />;
  }

  const name = user?.name ?? tAuth("account");
  const image = user?.image;
  const watchCount = hydrated && ready ? entries.length : 0;
  const watchlistActive = pathname.startsWith("/watchlist");
  const isAdmin = Boolean(user?.isAdmin);
  const sessionUnresolved = authEnabled && !user && isPending;
  const triggerLabel =
    watchCount > 0
      ? tNav("accountMenuAriaWithWatchlist", { count: watchCount })
      : user
        ? name
        : authEnabled
          ? tAuth("signIn")
          : tNav("preferences");

  function close() {
    setOpen(false);
    onNavigate?.();
  }

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md px-1.5 text-sm transition-colors",
          "text-muted-foreground hover:bg-accent hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          (open || watchlistActive) && "bg-accent text-foreground"
        )}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="menu"
        aria-label={triggerLabel}
        onClick={() => setOpen((value) => !value)}
      >
        {sessionUnresolved ? (
          <span
            className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-muted"
            aria-hidden
          />
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-6 w-6 shrink-0 rounded-full"
            width={24}
            height={24}
          />
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
            {user ? (
              <span className="text-xs font-medium">
                {name.slice(0, 1).toUpperCase()}
              </span>
            ) : (
              <UserRound className="h-3.5 w-3.5" aria-hidden />
            )}
          </span>
        )}
        <span className="hidden max-w-[7rem] truncate text-xs lg:inline">
          {user ? name : authEnabled ? tAuth("signIn") : tNav("account")}
        </span>
        {user && isAdmin ? (
          <span className="hidden rounded-sm bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary sm:inline">
            Admin
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "hidden h-3 w-3 shrink-0 opacity-60 transition-transform lg:block",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={listId}
          role="menu"
          aria-label={tAuth("account")}
          className="absolute right-0 top-[calc(100%+0.375rem)] z-50 w-64"
        >
          <AccountPanel onAction={close} />
        </div>
      )}
    </div>
  );
}
