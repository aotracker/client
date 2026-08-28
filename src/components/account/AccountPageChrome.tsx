"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LogOut, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LoginButtons, DiscordIcon } from "@/components/auth/LoginButtons";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageSection";
import { useAuthUser } from "@/components/SessionSnapshotProvider";
import { signOutWithPrefsSnapshot } from "@/lib/auth-prefs";
import { isSocialLoginVisible } from "@/lib/auth-providers";
import { cn } from "@/lib/utils";

export function AccountPageHeader({
  current = "general",
}: {
  current?: "general" | "discord";
}) {
  const t = useTranslations("Account");
  const tFeeds = useTranslations("Discord.feeds");
  const { user } = useAuthUser();

  return (
    <PageHeader
      title={t("title")}
      description={
        current === "discord" ? tFeeds("description") : t("description")
      }
      actions={
        user ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void signOutWithPrefsSnapshot(user.id)}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            {t("signOut")}
          </Button>
        ) : null
      }
    />
  );
}

export function AccountSettingsNav({
  current,
}: {
  current: "general" | "discord";
}) {
  const t = useTranslations("Account");
  const items = [
    {
      id: "general" as const,
      href: "/account",
      label: t("navGeneral"),
      icon: UserRound,
    },
    {
      id: "discord" as const,
      href: "/account/discord",
      label: t("navDiscord"),
      icon: DiscordIcon,
    },
  ];

  return (
    <nav
      aria-label={t("settingsNav")}
      className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/15 p-1"
    >
      {items.map((item) => {
        const active = item.id === current;
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground/90 shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {Icon ? (
              <Icon
                className={cn(
                  "h-3.5 w-3.5",
                  active
                    ? item.id === "discord"
                      ? "text-discord"
                      : "text-primary"
                    : "text-muted-foreground"
                )}
              />
            ) : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AccountSettingsRow({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border/60 py-3 last:border-b-0 last:pb-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:max-w-64">
        <p className="text-sm font-medium text-foreground/90">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div className="min-w-0 sm:flex sm:flex-1 sm:justify-end">{children}</div>
    </div>
  );
}

export function AccountSignInRequired({ callbackURL }: { callbackURL: string }) {
  const t = useTranslations("Account");
  const tAuth = useTranslations("Auth");
  const authEnabled = isSocialLoginVisible();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 animate-fade-in">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          <UserRound className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground/95">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("signInRequired")}
          </p>
        </div>
      </div>
      {authEnabled ? (
        <LoginButtons callbackURL={callbackURL} />
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {tAuth("loginUnavailable")}
        </p>
      )}
    </div>
  );
}
