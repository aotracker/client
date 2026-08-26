"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Check,
  CloudOff,
  Copy,
  Download,
  ShieldAlert,
  Star,
  Trash2,
  Unlink,
} from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import {
  DiscordIcon,
  GoogleIcon,
} from "@/components/auth/LoginButtons";
import { RelativeTime } from "@/components/RelativeTime";
import { useToast } from "@/components/Toast";
import { Button, buttonClassName } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import {
  isDiscordLoginVisible,
  isGoogleLoginVisible,
  type SocialAuthProvider,
} from "@/lib/auth-providers";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { rememberFeedRegionSelection } from "@/lib/region-params";
import {
  isPreferredRegion,
  type PreferredRegion,
} from "@/lib/region-preference";
import { WATCHLIST_STORAGE_KEY } from "@/lib/watchlist";
import { setRecentSearches } from "@/lib/search/recent-searches";
import { clearPrefsSyncFlag } from "@/lib/prefs-sync-flag";
import { parseUserAgentDevice } from "@/lib/user-agent";
import { ClaimedCharactersCard } from "@/components/account/ClaimedCharactersCard";
import {
  AccountPageHeader,
  AccountSettingsNav,
  AccountSettingsRow,
  AccountSignInRequired,
} from "@/components/account/AccountPageChrome";

type LinkedAccount = {
  providerId: string;
  accountId: string;
};

type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string | null;
    image?: string | null;
    preferredRegion?: string | null;
  };
  providers: string[];
  accounts: LinkedAccount[];
  watchlistCount: number;
  recentSearchCount: number;
};

type SessionSummary = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  current: boolean;
};

type Busy =
  | "clear"
  | "delete"
  | "export"
  | "region"
  | "revoke-others"
  | `unlink-${SocialAuthProvider}`
  | `revoke-${string}`
  | null;

function discordAccountId(accounts: LinkedAccount[]): string | null {
  const row = accounts.find((account) => account.providerId === "discord");
  return row?.accountId ?? null;
}

function sessionDeviceLabel(
  userAgent: string | null,
  unknownLabel: string,
  formatBoth: (browser: string, os: string) => string
): string {
  const parsed = parseUserAgentDevice(userAgent);
  if (!parsed) return unknownLabel;
  if (parsed.browser && parsed.os) {
    return formatBoth(parsed.browser, parsed.os);
  }
  return parsed.browser ?? parsed.os ?? unknownLabel;
}

export function AccountPageClient() {
  const t = useTranslations("Account");
  const tAuth = useTranslations("Auth");
  const tNav = useTranslations("Nav");
  const tRegions = useTranslations("Common.regions");
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, isPending } = useSession();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingMe, setLoadingMe] = useState(true);
  const [linkPending, setLinkPending] = useState<SocialAuthProvider | null>(
    null
  );
  const [linkError, setLinkError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

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

  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/user/sessions", { cache: "no-store" });
      if (!res.ok) {
        setSessions([]);
        return;
      }
      const data = (await res.json()) as { sessions?: SessionSummary[] };
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setMe(null);
      setSessions([]);
      setLoadingMe(false);
      return;
    }
    void refreshMe();
    void refreshSessions();
  }, [isPending, session?.user, refreshMe, refreshSessions]);

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

  async function unlinkProvider(provider: SocialAuthProvider) {
    setLinkError(null);
    setBusy(`unlink-${provider}`);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/user/account/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (res.status === 400) {
        const data = (await res.json()) as { error?: string };
        setLinkError(
          data.error === "last_provider" ? t("unlinkLastError") : t("unlinkError")
        );
        return;
      }
      if (!res.ok) throw new Error("unlink failed");
      setStatusMessage(t("unlinked"));
      await refreshMe();
    } catch {
      setLinkError(t("unlinkError"));
    } finally {
      setBusy(null);
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
      await refreshMe();
    } catch {
      setStatusMessage(t("clearError"));
    } finally {
      setBusy(null);
    }
  }

  async function exportData() {
    setBusy("export");
    setStatusMessage(null);
    try {
      const res = await fetch("/api/user/account/export", { cache: "no-store" });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "aotracker-account.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatusMessage(t("exported"));
    } catch {
      setStatusMessage(t("exportError"));
    } finally {
      setBusy(null);
    }
  }

  async function saveRegion(region: PreferredRegion) {
    setBusy("region");
    setStatusMessage(null);
    try {
      rememberFeedRegionSelection(region);
      setMe((prev) =>
        prev
          ? {
              ...prev,
              user: { ...prev.user, preferredRegion: region },
            }
          : prev
      );
      setStatusMessage(t("regionSaved"));
    } catch {
      setStatusMessage(t("regionError"));
    } finally {
      setBusy(null);
    }
  }

  async function revokeSession(id: string) {
    setBusy(`revoke-${id}`);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/user/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("revoke failed");
      setStatusMessage(t("sessionRevoked"));
      await refreshSessions();
    } catch {
      setStatusMessage(t("sessionRevokeError"));
    } finally {
      setBusy(null);
    }
  }

  async function revokeOtherSessions() {
    setBusy("revoke-others");
    setStatusMessage(null);
    try {
      const res = await fetch("/api/user/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ others: true }),
      });
      if (!res.ok) throw new Error("revoke others failed");
      setStatusMessage(t("sessionRevokeOthersDone"));
      await refreshSessions();
    } catch {
      setStatusMessage(t("sessionRevokeError"));
    } finally {
      setBusy(null);
    }
  }

  async function copyDiscordId(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast(t("copiedId"));
    } catch {
      toast(t("copyIdError"));
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
        <AccountPageHeader current="general" />
        {session?.user ? <AccountSettingsNav current="general" /> : null}
        <p className="text-sm text-muted-foreground">{tAuth("signingIn")}</p>
      </div>
    );
  }

  if (!session?.user) {
    return <AccountSignInRequired callbackURL="/account" />;
  }

  const user = me?.user ?? {
    id: session.user.id,
    name: session.user.name,
    email: null,
    image: session.user.image,
  };
  const providers = me?.providers ?? [];
  const accounts = me?.accounts ?? [];
  const hasDiscord = providers.includes("discord");
  const hasGoogle = providers.includes("google");
  const canUnlink = (hasDiscord ? 1 : 0) + (hasGoogle ? 1 : 0) > 1;
  const showLinkDiscord = isDiscordLoginVisible() && !hasDiscord;
  const showLinkGoogle = isGoogleLoginVisible() && !hasGoogle;
  const discordId = discordAccountId(accounts);
  const preferredRegion: PreferredRegion =
    typeof user.preferredRegion === "string" &&
    isPreferredRegion(user.preferredRegion)
      ? user.preferredRegion
      : "all";
  const watchlistCount = me?.watchlistCount ?? 0;
  const recentSearchCount = me?.recentSearchCount ?? 0;
  const otherSessions = sessions.filter((row) => !row.current);
  const providerLabel =
    hasDiscord && hasGoogle
      ? tAuth("signedInWithDiscordAndGoogle")
      : hasDiscord
        ? tAuth("signedInWithDiscord")
        : hasGoogle
          ? tAuth("signedInWithGoogle")
          : tAuth("signedIn");

  const regionOptions: { value: PreferredRegion; label: string }[] = [
    { value: "all", label: tRegions("all") },
    ...ENABLED_REGIONS.map((region) => ({
      value: region,
      label: tRegions(region),
    })),
  ];

  return (
    <div className="stagger-children space-y-6">
      <AccountPageHeader current="general" />
      <AccountSettingsNav current="general" />

      {statusMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {statusMessage}
        </p>
      ) : null}

      <Card className="relative z-20">
        <CardHeader>
          <CardTitle className="font-display text-base text-foreground/90">
            {t("identity")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex min-w-0 items-center gap-3">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full"
                width={44}
                height={44}
              />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                {(user.name ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground/90">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {[user.email, providerLabel].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="border-t border-border/60 pt-5">
            <ClaimedCharactersCard />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base text-foreground/90">
            {t("providersTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("providersBody")}</p>
        </CardHeader>
        <CardContent className="space-y-1">
          {(["discord", "google"] as const).map((provider) => {
            const linked = provider === "discord" ? hasDiscord : hasGoogle;
            const canLink =
              provider === "discord" ? showLinkDiscord : showLinkGoogle;
            return (
              <AccountSettingsRow
                key={provider}
                label={
                  <span className="inline-flex items-center gap-2">
                    {provider === "discord" ? (
                      <DiscordIcon className="h-4 w-4 text-discord" />
                    ) : (
                      <GoogleIcon className="h-4 w-4" />
                    )}
                    {provider === "discord" ? "Discord" : "Google"}
                  </span>
                }
                hint={
                  provider === "discord" && discordId
                    ? `${t("discordId")} ${discordId}`
                    : undefined
                }
              >
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {linked ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-stat-kill">
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        {t("linked")}
                      </span>
                      {provider === "discord" && discordId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void copyDiscordId(discordId)}
                        >
                          <Copy className="h-3 w-3" aria-hidden />
                          {t("copyId")}
                        </Button>
                      ) : null}
                      {canUnlink ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="hover:text-danger-foreground"
                          disabled={busy !== null}
                          onClick={() => void unlinkProvider(provider)}
                        >
                          <Unlink className="h-3 w-3" aria-hidden />
                          {busy === `unlink-${provider}`
                            ? t("unlinking")
                            : provider === "discord"
                              ? t("unlinkDiscord")
                              : t("unlinkGoogle")}
                        </Button>
                      ) : null}
                    </>
                  ) : canLink ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={linkPending !== null || busy !== null}
                      onClick={() => void linkProvider(provider)}
                    >
                      {linkPending === provider
                        ? t("linking")
                        : provider === "discord"
                          ? t("linkDiscord")
                          : t("linkGoogle")}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t("notLinked")}
                    </span>
                  )}
                </div>
              </AccountSettingsRow>
            );
          })}
          {linkError ? (
            <p className="pt-2 text-xs text-danger-foreground">{linkError}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="relative z-10">
        <CardHeader>
          <CardTitle className="font-display text-base text-foreground/90">
            {t("preferencesTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("syncedDataBody")}</p>
        </CardHeader>
        <CardContent>
          <AccountSettingsRow label={t("regionTitle")} hint={t("regionBody")}>
            <FilterSelect
              fit
              align="end"
              aria-label={t("regionTitle")}
              value={preferredRegion}
              options={regionOptions}
              disabled={busy !== null}
              onChange={(next) => void saveRegion(next)}
            />
          </AccountSettingsRow>
          <AccountSettingsRow
            label={tNav("watchlist")}
            hint={t("watchlistCount", { count: watchlistCount })}
          >
            <Link
              href="/watchlist"
              className={buttonClassName({ variant: "outline", size: "sm" })}
            >
              <Star className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {t("watchlistLink")}
            </Link>
          </AccountSettingsRow>
          <AccountSettingsRow label={t("recentSearchesTitle")}>
            <span className="text-sm tabular-nums text-muted-foreground">
              {recentSearchCount}
            </span>
          </AccountSettingsRow>
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void exportData()}
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {busy === "export" ? t("exporting") : t("exportData")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void clearSynced()}
            >
              <CloudOff className="h-3.5 w-3.5" aria-hidden />
              {busy === "clear" ? t("clearing") : t("clearSynced")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base text-foreground/90">
            {t("sessionsTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("sessionsBody")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            {sessions.map((row) => {
              const device = sessionDeviceLabel(
                row.userAgent,
                t("sessionUnknownDevice"),
                (browser, os) => t("sessionDevice", { browser, os })
              );
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Card variant="muted" className="flex w-full flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-0.5">
                    <p
                      className="truncate text-sm font-medium text-foreground/90"
                      title={row.userAgent ?? undefined}
                    >
                      {device}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.ipAddress ?? t("sessionUnknownIp")}
                      {" · "}
                      {t("sessionLastActive")}{" "}
                      <RelativeTime date={row.updatedAt} />
                    </p>
                  </div>
                  {row.current ? (
                    <span className="text-xs font-medium text-stat-kill">
                      {t("sessionCurrent")}
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={busy !== null}
                      onClick={() => void revokeSession(row.id)}
                    >
                      {busy === `revoke-${row.id}`
                        ? t("sessionRevoking")
                        : t("sessionRevoke")}
                    </Button>
                  )}
                  </Card>
                </li>
              );
            })}
          </ul>
          {otherSessions.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("sessionNone")}</p>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void revokeOtherSessions()}
            >
              {busy === "revoke-others"
                ? t("sessionRevoking")
                : t("sessionRevokeOthers")}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-danger-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base text-danger-foreground">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            {t("deleteTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("deleteBody")}</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1 space-y-1.5">
              <span className="text-label">{t("deleteConfirm")}</span>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="border-danger-border/40 focus-visible:ring-danger"
                autoComplete="off"
              />
            </label>
            <Button
              type="button"
              size="sm"
              className="shrink-0 bg-danger text-danger-foreground hover:bg-danger/90"
              disabled={busy !== null || deleteConfirm !== "DELETE"}
              onClick={() => void deleteAccount()}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {busy === "delete" ? t("deleting") : t("deleteAccount")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
