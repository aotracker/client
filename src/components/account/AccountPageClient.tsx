"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Check,
  CloudOff,
  Database,
  Link2,
  LogOut,
  ShieldAlert,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import {
  DiscordIcon,
  GoogleIcon,
  LoginButtons,
} from "@/components/auth/LoginButtons";
import { PageHeader } from "@/components/PageSection";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOutWithPrefsSnapshot } from "@/lib/auth-prefs";
import {
  isDiscordLoginVisible,
  isGoogleLoginVisible,
  isSocialLoginVisible,
  type SocialAuthProvider,
} from "@/lib/auth-providers";
import { WATCHLIST_STORAGE_KEY } from "@/lib/watchlist";
import { setRecentSearches } from "@/lib/search/recent-searches";
import { clearPrefsSyncFlag } from "@/lib/prefs-sync-flag";
import { cn } from "@/lib/utils";

type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    preferredRegion?: string | null;
  };
  providers: string[];
};

function ProviderChip({
  provider,
  label,
  linked,
}: {
  provider?: "discord" | "google";
  label: string;
  linked: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        linked
          ? provider === "discord"
            ? "border-[#5865F2]/35 bg-[#5865F2]/10 text-foreground"
            : provider === "google"
              ? "border-stat-ip/35 bg-stat-ip/10 text-foreground"
              : "border-primary/35 bg-primary/10 text-foreground"
          : "border-border bg-muted/40 text-muted-foreground"
      )}
    >
      {provider === "discord" ? (
        <DiscordIcon className="h-3 w-3 text-[#5865F2]" />
      ) : null}
      {provider === "google" ? <GoogleIcon className="h-3 w-3" /> : null}
      {label}
    </span>
  );
}

function ProviderRow({
  provider,
  linked,
  linkedLabel,
}: {
  provider: "discord" | "google";
  linked: boolean;
  linkedLabel: string;
}) {
  return (
    <li
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2.5",
        linked
          ? provider === "discord"
            ? "border-[#5865F2]/25 bg-[#5865F2]/5"
            : "border-stat-ip/25 bg-stat-ip/5"
          : "border-border bg-muted/20"
      )}
    >
      <span className="inline-flex items-center gap-2.5 text-sm font-medium text-foreground">
        {provider === "discord" ? (
          <DiscordIcon className="h-4 w-4 text-[#5865F2]" />
        ) : (
          <GoogleIcon className="h-4 w-4" />
        )}
        {provider === "discord" ? "Discord" : "Google"}
      </span>
      {linked ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-stat-kill">
          <Check className="h-3.5 w-3.5" aria-hidden />
          {linkedLabel}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </li>
  );
}

export function AccountPageClient() {
  const t = useTranslations("Account");
  const tAuth = useTranslations("Auth");
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [linkPending, setLinkPending] = useState<SocialAuthProvider | null>(
    null
  );
  const [linkError, setLinkError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"clear" | "delete" | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const authEnabled = isSocialLoginVisible();

  const refreshMe = useCallback(async () => {
    setLoadingMe(true);
    try {
      const res = await fetch("/api/user/me", { cache: "no-store" });
      if (!res.ok) {
        setMe(null);
        return;
      }
      setMe((await res.json()) as MeResponse);
    } catch {
      setMe(null);
    } finally {
      setLoadingMe(false);
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setMe(null);
      setLoadingMe(false);
      return;
    }
    void refreshMe();
  }, [isPending, session?.user, refreshMe]);

  async function linkProvider(provider: SocialAuthProvider) {
    setLinkError(null);
    setLinkPending(provider);
    try {
      await authClient.linkSocial({
        provider,
        callbackURL: "/account",
      });
    } catch {
      setLinkError(t("linkError"));
      setLinkPending(null);
    }
  }

  function wipeLocalPrefs() {
    try {
      localStorage.removeItem(WATCHLIST_STORAGE_KEY);
      setRecentSearches([]);
    } catch {
      // ignore
    }
  }

  async function clearSynced() {
    setBusy("clear");
    setStatusMessage(null);
    try {
      const res = await fetch("/api/user/account", { method: "DELETE" });
      if (!res.ok) throw new Error("clear failed");
      wipeLocalPrefs();
      clearPrefsSyncFlag(session?.user?.id);
      setStatusMessage(t("cleared"));
    } catch {
      setStatusMessage(t("clearError"));
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") return;
    setBusy("delete");
    try {
      const res = await fetch("/api/user/account?account=1", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      clearPrefsSyncFlag(session?.user?.id);
      wipeLocalPrefs();
      await authClient.signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setStatusMessage(t("deleteError"));
      setBusy(null);
    }
  }

  if (isPending || (session?.user && loadingMe && !me)) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("description")} />
        <p className="text-sm text-muted-foreground">{tAuth("signingIn")}</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 animate-fade-in">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("signInRequired")}
            </p>
          </div>
        </div>
        {authEnabled ? (
          <LoginButtons callbackURL="/account" />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {tAuth("loginUnavailable")}
          </p>
        )}
      </div>
    );
  }

  const user = me?.user ?? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
  const providers = me?.providers ?? [];
  const hasDiscord = providers.includes("discord");
  const hasGoogle = providers.includes("google");
  const showLinkDiscord = isDiscordLoginVisible() && !hasDiscord;
  const showLinkGoogle = isGoogleLoginVisible() && !hasGoogle;
  const providerLabel =
    hasDiscord && hasGoogle
      ? tAuth("signedInWithDiscordAndGoogle")
      : hasDiscord
        ? tAuth("signedInWithDiscord")
        : hasGoogle
          ? tAuth("signedInWithGoogle")
          : tAuth("signedIn");

  return (
    <div className="stagger-children space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/80 bg-muted/30 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => void signOutWithPrefsSnapshot(session.user.id)}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            {t("signOut")}
          </button>
        }
      />

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/12 via-card to-card">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full ring-2 ring-primary/40 ring-offset-2 ring-offset-card"
                width={64}
                height={64}
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-card">
                {(user.name ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 space-y-1.5">
              <p className="truncate font-display text-xl font-semibold text-foreground">
                {user.name}
              </p>
              <p className="text-sm text-muted-foreground">{providerLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {hasDiscord ? (
                  <ProviderChip provider="discord" label="Discord" linked />
                ) : null}
                {hasGoogle ? (
                  <ProviderChip provider="google" label="Google" linked />
                ) : null}
                {!hasDiscord && !hasGoogle ? (
                  <ProviderChip label={tAuth("signedIn")} linked={false} />
                ) : null}
              </div>
            </div>
          </div>
          <Link
            href="/watchlist"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Star className="h-4 w-4" aria-hidden />
            {t("watchlistLink")}
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full border-border/80 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Link2 className="h-3.5 w-3.5" aria-hidden />
              </span>
              {t("providersTitle")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("providersBody")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2">
              <ProviderRow
                provider="discord"
                linked={hasDiscord}
                linkedLabel={t("linked")}
              />
              <ProviderRow
                provider="google"
                linked={hasGoogle}
                linkedLabel={t("linked")}
              />
            </ul>
            {(showLinkDiscord || showLinkGoogle) && (
              <div className="flex flex-col gap-2 sm:flex-row">
                {showLinkDiscord ? (
                  <button
                    type="button"
                    className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[#5865F2]/35 bg-[#5865F2]/10 px-3 text-xs font-medium text-foreground transition-colors hover:bg-[#5865F2]/15 disabled:opacity-60"
                    disabled={linkPending !== null}
                    onClick={() => void linkProvider("discord")}
                  >
                    <DiscordIcon className="h-3.5 w-3.5 text-[#5865F2]" />
                    {linkPending === "discord" ? t("linking") : t("linkDiscord")}
                  </button>
                ) : null}
                {showLinkGoogle ? (
                  <button
                    type="button"
                    className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-stat-ip/35 bg-stat-ip/10 px-3 text-xs font-medium text-foreground transition-colors hover:bg-stat-ip/15 disabled:opacity-60"
                    disabled={linkPending !== null}
                    onClick={() => void linkProvider("google")}
                  >
                    <GoogleIcon className="h-3.5 w-3.5" />
                    {linkPending === "google" ? t("linking") : t("linkGoogle")}
                  </button>
                ) : null}
              </div>
            )}
            {linkError ? (
              <p className="text-xs text-danger-foreground">{linkError}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="h-full border-info-border/25 bg-gradient-to-br from-info/8 via-card to-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-info/15 text-info">
                <Database className="h-3.5 w-3.5" aria-hidden />
              </span>
              {t("syncedDataTitle")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("syncedDataBody")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              type="button"
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-info-border/35 bg-info/10 px-3 text-xs font-medium text-info-foreground transition-colors hover:bg-info/15 disabled:opacity-60 sm:w-auto"
              disabled={busy !== null}
              onClick={() => void clearSynced()}
            >
              <CloudOff className="h-3.5 w-3.5" aria-hidden />
              {busy === "clear" ? t("clearing") : t("clearSynced")}
            </button>
            {statusMessage ? (
              <p className="text-xs text-muted-foreground">{statusMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-danger-border/35 bg-gradient-to-br from-danger/10 via-card to-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base text-danger-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-danger/15 text-danger">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
            </span>
            {t("deleteTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("deleteBody")}</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1 space-y-1.5">
              <span className="text-xs text-muted-foreground">
                {t("deleteConfirm")}
              </span>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="flex h-9 w-full rounded-md border border-danger-border/40 bg-background/80 px-3 text-sm outline-none transition-colors focus-visible:border-danger-border focus-visible:ring-2 focus-visible:ring-danger/30"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-danger px-4 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              disabled={busy !== null || deleteConfirm !== "DELETE"}
              onClick={() => void deleteAccount()}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {busy === "delete" ? t("deleting") : t("deleteAccount")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
