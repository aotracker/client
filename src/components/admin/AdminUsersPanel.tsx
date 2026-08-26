"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Globe2,
  Search,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { DiscordIcon, GoogleIcon } from "@/components/auth/LoginButtons";
import { PageHeader } from "@/components/PageSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import {
  displayableAccountEmail,
  isSyntheticDiscordEmail,
} from "@/lib/auth-email";
import {
  cn,
  formatExactDateTime,
  formatRelativeTime,
  regionLabel,
} from "@/lib/utils";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  isAdmin: boolean;
  preferredRegion: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  providers: Array<{
    providerId: string;
    accountId: string;
    createdAt?: string | Date;
  }>;
  claims: Array<{
    id: string;
    region: string;
    albionId: string;
    name: string;
    claimedAt: string | Date;
  }>;
  watchlistCount: number;
  recentSearchCount: number;
  lastActiveAt: string | Date | null;
  activeSessionCount: number;
};

function preferredRegionLabel(region: string | null): string {
  if (!region) return "Not set";
  if (region === "all") return "All regions";
  return regionLabel(region);
}

function formatWhen(value: string | Date | null | undefined): string {
  if (!value) return "Never";
  return formatRelativeTime(value);
}

function accountEmailLine(user: AdminUser): {
  text: string;
  showVerifiedBadge: boolean;
  verified: boolean;
} {
  const providerIds = user.providers.map((p) => p.providerId);
  const displayEmail = displayableAccountEmail(user.email, providerIds);
  if (displayEmail) {
    return {
      text: displayEmail,
      showVerifiedBadge: true,
      verified: user.emailVerified,
    };
  }
  if (isSyntheticDiscordEmail(user.email) || providerIds.includes("discord")) {
    return {
      text: "No email (Discord does not share one)",
      showVerifiedBadge: false,
      verified: false,
    };
  }
  if (user.email?.trim()) {
    return {
      text: user.email.trim(),
      showVerifiedBadge: true,
      verified: user.emailVerified,
    };
  }
  return {
    text: "No email on file",
    showVerifiedBadge: false,
    verified: false,
  };
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <Card variant="muted" className="flex items-center gap-2 px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <div className="min-w-0 leading-tight">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium tabular-nums text-foreground">
          {value}
        </p>
      </div>
    </Card>
  );
}

function ProviderPill({
  providerId,
  accountId,
}: {
  providerId: string;
  accountId: string;
}) {
  const isDiscord = providerId === "discord";
  const isGoogle = providerId === "google";
  const label = isDiscord ? "Discord" : isGoogle ? "Google" : providerId;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
        isDiscord
          ? "border-discord/30 bg-discord/10"
          : isGoogle
            ? "border-stat-ip/30 bg-stat-ip/10"
            : "border-border bg-muted/30"
      )}
      title={`${label}: ${accountId}`}
    >
      {isDiscord ? (
        <DiscordIcon className="h-3 w-3 shrink-0 text-discord" />
      ) : null}
      {isGoogle ? <GoogleIcon className="h-3 w-3 shrink-0" /> : null}
      <span className="font-medium text-foreground">{label}</span>
      <span className="truncate font-mono text-muted-foreground">
        {accountId}
      </span>
    </span>
  );
}

export function AdminUsersPanel() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reassign, setReassign] = useState<
    Record<string, { region: string; query: string }>
  >({});

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/users?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load users");
      const data = (await res.json()) as { users: AdminUser[] };
      setUsers(data.users ?? []);
    } catch {
      setError("Could not load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load(q);
    }, 250);
    return () => window.clearTimeout(id);
  }, [q, load]);

  async function setAdmin(userId: string, isAdmin: boolean) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isAdmin }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Update failed");
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isAdmin } : u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function mutateClaim(
    userId: string,
    body: Record<string, string>
  ): Promise<boolean> {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...body }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Claim update failed");
      }
      await load(q);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim update failed");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  const summary = useMemo(() => {
    const adminCount = users.filter((u) => u.isAdmin).length;
    const activeCount = users.filter((u) => u.activeSessionCount > 0).length;
    const linkedCount = users.filter((u) => u.providers.length > 0).length;
    return { adminCount, activeCount, linkedCount };
  }, [users]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Linked Discord/Google accounts, sync usage, claimed characters, and admin access. Discord sign-ins use a local placeholder email that is never shown here."
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatChip icon={Users} label="Shown" value={users.length} />
        <StatChip icon={Shield} label="Admins" value={summary.adminCount} />
        <StatChip
          icon={Clock3}
          label="Active sessions"
          value={summary.activeCount}
        />
        <StatChip
          icon={Globe2}
          label="Linked providers"
          value={summary.linkedCount}
        />
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" aria-hidden />
            Accounts
          </CardTitle>
          <div className="relative max-w-lg">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, Google email, user id, region, Discord id, or Google sub"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <p className="text-sm text-danger-foreground">{error}</p> : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <ul className="space-y-3">
              {users.map((user) => {
                const discord = user.providers.find(
                  (p) => p.providerId === "discord"
                );
                const google = user.providers.find(
                  (p) => p.providerId === "google"
                );
                const otherProviders = user.providers.filter(
                  (p) =>
                    p.providerId !== "discord" && p.providerId !== "google"
                );
                const emailLine = accountEmailLine(user);

                return (
                  <li key={user.id}>
                    <Card variant="muted" className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          {user.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.image}
                              alt=""
                              className="h-11 w-11 shrink-0 rounded-full ring-1 ring-border"
                              width={44}
                              height={44}
                            />
                          ) : (
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium ring-1 ring-border">
                              {user.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {user.name}
                              </p>
                              {user.isAdmin ? (
                                <Badge variant="default" size="sm">
                                  Admin
                                </Badge>
                              ) : null}
                              {user.activeSessionCount > 0 ? (
                                <Badge variant="success" size="sm">
                                  Signed in
                                </Badge>
                              ) : null}
                              {emailLine.showVerifiedBadge ? (
                                <Badge variant="outline" size="sm">
                                  {emailLine.verified
                                    ? "Email verified"
                                    : "Email unverified"}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {emailLine.text}
                            </p>
                            <p
                              className="truncate font-mono text-xs text-muted-foreground"
                              title={user.id}
                            >
                              {user.id}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-md border border-border/70 bg-muted/15 px-2.5 py-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Joined
                            </p>
                            <p
                              className="text-xs font-medium text-foreground"
                              title={formatExactDateTime(user.createdAt)}
                            >
                              {formatWhen(user.createdAt)}
                            </p>
                          </div>
                          <div className="rounded-md border border-border/70 bg-muted/15 px-2.5 py-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Last active
                            </p>
                            <p
                              className="text-xs font-medium text-foreground"
                              title={
                                user.lastActiveAt
                                  ? formatExactDateTime(user.lastActiveAt)
                                  : undefined
                              }
                            >
                              {formatWhen(user.lastActiveAt)}
                              {user.activeSessionCount > 0
                                ? ` · ${user.activeSessionCount} session${
                                    user.activeSessionCount === 1 ? "" : "s"
                                  }`
                                : ""}
                            </p>
                          </div>
                          <div className="rounded-md border border-border/70 bg-muted/15 px-2.5 py-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Preferred region
                            </p>
                            <p className="text-xs font-medium text-foreground">
                              {preferredRegionLabel(user.preferredRegion)}
                            </p>
                          </div>
                          <div className="rounded-md border border-border/70 bg-muted/15 px-2.5 py-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Synced data
                            </p>
                            <p className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Star
                                  className="h-3 w-3 text-primary"
                                  aria-hidden
                                />
                                {user.watchlistCount} watchlist
                              </span>
                              <span className="text-muted-foreground">·</span>
                              <span className="inline-flex items-center gap-1">
                                <Search
                                  className="h-3 w-3 text-muted-foreground"
                                  aria-hidden
                                />
                                {user.recentSearchCount} recent
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {discord ? (
                            <ProviderPill
                              providerId="discord"
                              accountId={discord.accountId}
                            />
                          ) : null}
                          {google ? (
                            <ProviderPill
                              providerId="google"
                              accountId={google.accountId}
                            />
                          ) : null}
                          {otherProviders.map((provider) => (
                            <ProviderPill
                              key={`${provider.providerId}:${provider.accountId}`}
                              providerId={provider.providerId}
                              accountId={provider.accountId}
                            />
                          ))}
                          {user.providers.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              No linked providers
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-2 rounded-md border border-border/70 bg-muted/10 px-2.5 py-2">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Claimed characters
                          </p>
                          {(user.claims ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              None
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {(user.claims ?? []).map((claim) => (
                                <li
                                  key={claim.id}
                                  className="flex flex-wrap items-center justify-between gap-2 text-xs"
                                >
                                  <span className="min-w-0 truncate text-foreground">
                                    {claim.name}{" "}
                                    <span className="text-muted-foreground">
                                      ({regionLabel(claim.region)})
                                    </span>
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={busyId === user.id}
                                    onClick={() =>
                                      void mutateClaim(user.id, {
                                        action: "unclaim",
                                        region: claim.region,
                                      })
                                    }
                                  >
                                    Force unclaim
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                            <Select
                              size="sm"
                              className="w-auto"
                              value={
                                reassign[user.id]?.region ??
                                user.preferredRegion ??
                                "americas"
                              }
                              onChange={(event) =>
                                setReassign((prev) => ({
                                  ...prev,
                                  [user.id]: {
                                    region: event.target.value,
                                    query: prev[user.id]?.query ?? "",
                                  },
                                }))
                              }
                            >
                              <option value="americas">Americas</option>
                              <option value="europe">Europe</option>
                              <option value="asia">Asia</option>
                            </Select>
                            <Input
                              size="sm"
                              className="min-w-0 flex-1"
                              placeholder="Player name or Albion id"
                              value={reassign[user.id]?.query ?? ""}
                              onChange={(event) =>
                                setReassign((prev) => ({
                                  ...prev,
                                  [user.id]: {
                                    region:
                                      prev[user.id]?.region ??
                                      user.preferredRegion ??
                                      "americas",
                                    query: event.target.value,
                                  },
                                }))
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              disabled={
                                busyId === user.id ||
                                !(reassign[user.id]?.query ?? "").trim()
                              }
                              onClick={() => {
                                const draft = reassign[user.id];
                                const query = draft?.query.trim() ?? "";
                                if (!query) return;
                                void mutateClaim(user.id, {
                                  action: "reassign",
                                  region:
                                    draft?.region ??
                                    user.preferredRegion ??
                                    "americas",
                                  name: query,
                                  albionId: query,
                                });
                              }}
                            >
                              Reassign
                            </Button>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant={user.isAdmin ? "outline" : "default"}
                        size="sm"
                        className="shrink-0"
                        disabled={busyId === user.id}
                        onClick={() => void setAdmin(user.id, !user.isAdmin)}
                      >
                        {busyId === user.id
                          ? "Saving…"
                          : user.isAdmin
                            ? "Demote admin"
                            : "Promote to admin"}
                      </Button>
                    </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
