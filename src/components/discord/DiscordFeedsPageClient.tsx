"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Bot,
  Hash,
  Pause,
  Swords,
  Skull,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import {
  AccountPageHeader,
  AccountSettingsNav,
  AccountSignInRequired,
} from "@/components/account/AccountPageChrome";
import { RelativeTime } from "@/components/RelativeTime";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filter-select";
import { ENABLED_REGIONS, type AlbionRegion } from "@/lib/albion/types";
import {
  FEED_GUILD_DEATHS,
  FEED_GUILD_KILLS,
  type DiscordFeedFilters,
  type FeedSummary,
} from "@/lib/discord-feed-types";
import { cn } from "@/lib/utils";

type GuildListItem = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  botInstalled: boolean;
  feeds: FeedSummary[];
};

type GuildDetail = {
  guild: { id: string; name: string };
  botInstalled: boolean;
  inviteUrl: string | null;
  channels: Array<{ id: string; name: string; type: number }>;
  roles: Array<{ id: string; name: string; managed: boolean }>;
  feeds: FeedSummary[];
  channelsError?: string | null;
  botTokenConfigured?: boolean;
};

type GuildHit = {
  albionId: string;
  name: string;
  region: AlbionRegion;
};

const CONTENT_OPTIONS = ["SOLO", "GROUP", "ZVZ"] as const;
const ACCOUNT_CARD = "border-border/80 bg-card/80";

function DiscordFeedsShell({ children }: { children: React.ReactNode }) {
  const tFeeds = useTranslations("Discord.feeds");
  return (
    <div className="stagger-children space-y-6">
      <AccountPageHeader current="discord" />
      <div className="space-y-2">
        <AccountSettingsNav current="discord" />
        <Link
          href="/discord"
          className="inline-block text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          {tFeeds("backToDiscord")}
        </Link>
      </div>
      {children}
    </div>
  );
}

function guildIconUrl(guild: { id: string; icon: string | null }): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
}

function feedOf(feeds: FeedSummary[], type: string): FeedSummary | undefined {
  return feeds.find((feed) => feed.feedType === type);
}

function GuildAvatar({
  guild,
  size = "md",
}: {
  guild: { id: string; name: string; icon: string | null };
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-6 w-6 text-[10px]" : "h-10 w-10 text-sm";
  const url = guildIconUrl(guild);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
        className={cn(dim, "rounded-md object-cover")}
        width={size === "sm" ? 24 : 40}
        height={size === "sm" ? 24 : 40}
      />
    );
  }
  return (
    <span
      className={cn(
        dim,
        "flex items-center justify-center rounded-md bg-muted font-medium text-muted-foreground"
      )}
    >
      {guild.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function StatusPill({
  label,
  value,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/50 bg-muted/15 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "mt-1 truncate text-sm",
          muted
            ? "font-normal text-muted-foreground"
            : "font-medium text-foreground/90"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function PostedAt({ value, neverLabel }: { value: string | null; neverLabel: string }) {
  if (!value) return <>{neverLabel}</>;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <>{value}</>;
  return <RelativeTime date={date} />;
}

export function DiscordFeedsPageClient() {
  const t = useTranslations("Discord.feeds");
  const tAuth = useTranslations("Auth");
  const tRegions = useTranslations("Common.regions");
  const tContent = useTranslations("Common.contentTypes");
  const { data: session, isPending } = useSession();
  const [guilds, setGuilds] = useState<GuildListItem[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GuildDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [needsDiscord, setNeedsDiscord] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [busy, setBusy] = useState(false);

  const [region, setRegion] = useState<AlbionRegion>(ENABLED_REGIONS[0] ?? "americas");
  const [guildQuery, setGuildQuery] = useState("");
  const [guildHits, setGuildHits] = useState<GuildHit[]>([]);
  const [pendingGuild, setPendingGuild] = useState<GuildHit | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    setNeedsReauth(false);
    setNeedsDiscord(false);
    try {
      const res = await fetch("/api/discord/feeds", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        inviteUrl?: string | null;
        guilds?: GuildListItem[];
      } | null;
      if (res.status === 403 && data?.error === "not_linked") {
        setNeedsDiscord(true);
        setGuilds([]);
        return;
      }
      if (
        (res.status === 401 || res.status === 403) &&
        data?.error === "needs_reauth"
      ) {
        setNeedsReauth(true);
        setGuilds([]);
        return;
      }
      if (res.status === 429 || data?.error === "rate_limited") {
        setError(t("rateLimited"));
        return;
      }
      if (!res.ok) {
        setError(t("loadError"));
        return;
      }
      setInviteUrl(data?.inviteUrl ?? null);
      setGuilds(data?.guilds ?? []);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoadingList(false);
    }
  }, [t]);

  const loadDetail = useCallback(
    async (guildId: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/discord/feeds/${guildId}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as
          | (GuildDetail & { error?: string })
          | null;
        if (!res.ok) {
          setError(t("loadError"));
          return;
        }
        setDetail(data);
      } catch {
        setError(t("loadError"));
      } finally {
        setBusy(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setLoadingList(false);
      return;
    }
    void loadList();
  }, [isPending, session?.user, loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const q = guildQuery.trim();
    if (q.length < 2) {
      setGuildHits([]);
      return;
    }
    const id = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, region, limit: "8" });
        const res = await fetch(`/api/search?${params}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { local?: { guilds?: GuildHit[] } };
        setGuildHits(
          (data.local?.guilds ?? [])
            .filter((guild) => guild.region === region)
            .slice(0, 8)
        );
      } catch {
        setGuildHits([]);
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [guildQuery, region]);

  async function postAction(body: Record<string, unknown>) {
    if (!selectedId) return false;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/discord/feeds/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        inviteUrl?: string | null;
        feeds?: FeedSummary[];
      } | null;
      if (res.status === 409 && data?.error === "bot_not_installed") {
        setError(t("botMissing"));
        if (data.inviteUrl) setInviteUrl(data.inviteUrl);
        return false;
      }
      if (res.status === 429 || data?.error === "rate_limited") {
        setError(t("rateLimited"));
        return false;
      }
      if (!res.ok) {
        setError(t("saveError"));
        return false;
      }
      // Update feeds locally — do not call loadList() here. That hits Discord's
      // /users/@me/guilds and is easy to 429 after track/channel/filter saves.
      if (data?.feeds) {
        setDetail((prev) =>
          prev ? { ...prev, feeds: data.feeds!, botInstalled: true } : prev
        );
        setGuilds((prev) =>
          prev.map((guild) =>
            guild.id === selectedId
              ? { ...guild, feeds: data.feeds!, botInstalled: true }
              : guild
          )
        );
      } else {
        await loadDetail(selectedId);
      }
      return true;
    } catch {
      setError(t("saveError"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function reconnectDiscord() {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: "/account/discord",
    });
  }

  const selected = guilds.find((guild) => guild.id === selectedId) ?? null;
  const kills = feedOf(detail?.feeds ?? [], FEED_GUILD_KILLS);
  const deaths = feedOf(detail?.feeds ?? [], FEED_GUILD_DEATHS);
  const trackedName = kills?.targetName ?? deaths?.targetName ?? null;
  const trackedRegion = kills?.region ?? deaths?.region ?? null;
  const botReady = Boolean(selected?.botInstalled || detail?.botInstalled);

  const regionOptions = ENABLED_REGIONS.map((value) => ({
    value,
    label: tRegions(value),
  }));

  const channelOptions = useMemo(
    () => [
      { value: "", label: t("channelUnset") },
      ...(detail?.channels ?? []).map((channel) => ({
        value: channel.id,
        label: `#${channel.name}`,
      })),
    ],
    [detail?.channels, t]
  );

  const channelsWarning =
    detail?.channelsError === "missing_token"
      ? t("channelsMissingToken")
      : detail?.channelsError === "bot_not_in_guild" ||
          detail?.channelsError === "forbidden"
        ? t("channelsBotUnavailable")
        : detail?.channelsError
          ? t("channelsLoadError")
          : detail && detail.channels.length === 0
            ? t("channelsEmpty")
            : null;

  if (isPending) {
    return (
      <div className="space-y-6">
        <AccountPageHeader current="discord" />
        {session?.user ? <AccountSettingsNav current="discord" /> : null}
        <p className="text-sm text-muted-foreground">{tAuth("signingIn")}</p>
      </div>
    );
  }

  if (!session?.user) {
    return <AccountSignInRequired callbackURL="/account/discord" />;
  }

  if (loadingList && guilds.length === 0 && !needsReauth && !needsDiscord && !error) {
    return (
      <DiscordFeedsShell>
        <p className="text-sm text-muted-foreground">{tAuth("signingIn")}</p>
      </DiscordFeedsShell>
    );
  }

  if (needsDiscord) {
    return (
      <DiscordFeedsShell>
        <Card className={ACCOUNT_CARD}>
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-muted-foreground">{t("linkDiscordBody")}</p>
            <Button type="button" onClick={() => void reconnectDiscord()}>
              {t("linkDiscord")}
            </Button>
          </CardContent>
        </Card>
      </DiscordFeedsShell>
    );
  }

  if (needsReauth) {
    return (
      <DiscordFeedsShell>
        <Card className={ACCOUNT_CARD}>
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-muted-foreground">{t("reauthBody")}</p>
            <Button type="button" onClick={() => void reconnectDiscord()}>
              {t("reauth")}
            </Button>
          </CardContent>
        </Card>
      </DiscordFeedsShell>
    );
  }

  return (
    <DiscordFeedsShell>
      {error ? (
        <p className="text-sm text-danger-foreground" role="status">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:items-start">
        <Card className={ACCOUNT_CARD}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base text-foreground/90">
              {t("serversTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {guilds.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("serversEmpty")}</p>
            ) : (
              <ul className="space-y-0.5">
                {guilds.map((guild) => (
                  <li key={guild.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                        selectedId === guild.id
                          ? "bg-primary/10 text-foreground ring-1 ring-primary/20"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                      onClick={() => setSelectedId(guild.id)}
                    >
                      <GuildAvatar guild={guild} size="sm" />
                      <span className="min-w-0 flex-1 truncate">{guild.name}</span>
                      {guild.botInstalled ? (
                        <Bot
                          className="h-3.5 w-3.5 shrink-0 text-primary/80"
                          aria-label={t("botReady")}
                        />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          {!selected ? (
            <Card className={ACCOUNT_CARD}>
              <CardContent className="flex min-h-40 items-center justify-center p-6">
                <p className="text-center text-sm text-muted-foreground">
                  {t("pickServer")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className={ACCOUNT_CARD}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <GuildAvatar guild={selected} />
                      <div className="min-w-0">
                        <h2 className="font-display truncate text-lg font-semibold tracking-tight text-foreground/95">
                          {selected.name}
                        </h2>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Bot className="h-3.5 w-3.5 text-muted-foreground/80" aria-hidden />
                          {botReady ? t("botReady") : t("botNotReady")}
                        </p>
                      </div>
                    </div>
                    {!botReady && inviteUrl ? (
                      <a
                        href={inviteUrl}
                        className="inline-flex h-9 shrink-0 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                      >
                        {t("inviteBot")}
                      </a>
                    ) : null}
                  </div>

                  {!botReady ? (
                    <p className="rounded-md border border-border/60 bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
                      {t("botMissing")}
                    </p>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <StatusPill
                      label={t("statusGuild")}
                      value={
                        trackedName
                          ? `${trackedName} · ${trackedRegion ? tRegions(trackedRegion) : "?"}`
                          : t("statusNone")
                      }
                      muted={!trackedName}
                    />
                    <StatusPill
                      label={t("statusKills")}
                      value={
                        <>
                          {channelLabel(kills?.channelId, detail?.channels) ??
                            t("channelUnset")}
                          {kills?.filters.paused ? (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Pause className="h-3 w-3" aria-hidden />
                              {t("paused")}
                            </span>
                          ) : null}
                        </>
                      }
                      muted={!kills?.channelId}
                    />
                    <StatusPill
                      label={t("statusDeaths")}
                      value={
                        <>
                          {channelLabel(deaths?.channelId, detail?.channels) ??
                            t("channelUnset")}
                          {deaths?.filters.paused ? (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Pause className="h-3 w-3" aria-hidden />
                              {t("paused")}
                            </span>
                          ) : null}
                        </>
                      }
                      muted={!deaths?.channelId}
                    />
                    <StatusPill
                      label={t("statusLastActivity")}
                      muted
                      value={
                        <span className="flex flex-col gap-0.5 text-xs font-normal">
                          <span>
                            <span className="text-muted-foreground/80">
                              {t("statusKills")}:{" "}
                            </span>
                            <PostedAt
                              value={kills?.lastPostedAt ?? null}
                              neverLabel={t("neverPosted")}
                            />
                          </span>
                          <span>
                            <span className="text-muted-foreground/80">
                              {t("statusDeaths")}:{" "}
                            </span>
                            <PostedAt
                              value={deaths?.lastPostedAt ?? null}
                              neverLabel={t("neverPosted")}
                            />
                          </span>
                        </span>
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className={ACCOUNT_CARD}>
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base text-foreground/90">
                    {t("trackTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trackedName ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground/90">
                          {trackedName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {trackedRegion ? tRegions(trackedRegion) : null}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void postAction({ action: "untrack" })}
                      >
                        {t("untrack")}
                      </Button>
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
                    <FilterSelect
                      aria-label={t("region")}
                      value={region}
                      options={regionOptions}
                      disabled={busy}
                      className="w-full sm:w-auto"
                      onChange={(next) => {
                        setRegion(next);
                        setPendingGuild(null);
                      }}
                    />
                    <input
                      value={guildQuery}
                      onChange={(event) => {
                        setGuildQuery(event.target.value);
                        setPendingGuild(null);
                      }}
                      disabled={busy}
                      placeholder={t("guildSearch")}
                      className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                      autoComplete="off"
                    />
                  </div>
                  {guildHits.length > 0 && !pendingGuild ? (
                    <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
                      {guildHits.map((hit) => (
                        <li key={`${hit.region}:${hit.albionId}`}>
                          <button
                            type="button"
                            className="flex w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                            onClick={() => setPendingGuild(hit)}
                          >
                            {hit.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {pendingGuild ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                      <p className="min-w-0 flex-1 text-sm font-medium text-foreground/90">
                        {pendingGuild.name}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void postAction({
                            action: "track",
                            region: pendingGuild.region,
                            albionGuildId: pendingGuild.albionId,
                          })
                        }
                      >
                        {t("track")}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {kills || deaths ? (
                <>
                  {channelsWarning ? (
                    <div className="flex gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground"
                        aria-hidden
                      />
                      <div className="min-w-0 space-y-2">
                        <p className="text-sm text-muted-foreground">{channelsWarning}</p>
                        {(detail?.channelsError === "bot_not_in_guild" ||
                          detail?.channelsError === "forbidden") &&
                        (detail.inviteUrl || inviteUrl) ? (
                          <a
                            href={detail.inviteUrl ?? inviteUrl ?? "#"}
                            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
                          >
                            {t("inviteBot")}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-4 xl:grid-cols-2">
                    <FeedEditor
                      title={t("killsTitle")}
                      icon={Swords}
                      feed={kills}
                      channelOptions={channelOptions}
                      roles={detail?.roles ?? []}
                      contentLabel={t("contentTypes")}
                      contentLabels={{
                        SOLO: tContent("SOLO"),
                        GROUP: tContent("GROUP"),
                        ZVZ: tContent("ZVZ"),
                      }}
                      busy={busy}
                      onChannel={(channelId) =>
                        void postAction({
                          action: "set-channel",
                          feed: "kills",
                          channelId,
                        })
                      }
                      onFilters={(patch) =>
                        void postAction({
                          action: "filters",
                          feed: "kills",
                          ...patch,
                        })
                      }
                      onPingRole={(roleId) =>
                        void postAction({
                          action: "ping-role",
                          feed: "kills",
                          roleId,
                        })
                      }
                      onTest={() =>
                        void postAction({ action: "test-post", feed: "kills" })
                      }
                    />
                    <FeedEditor
                      title={t("deathsTitle")}
                      icon={Skull}
                      feed={deaths}
                      channelOptions={channelOptions}
                      roles={detail?.roles ?? []}
                      contentLabel={t("contentTypes")}
                      contentLabels={{
                        SOLO: tContent("SOLO"),
                        GROUP: tContent("GROUP"),
                        ZVZ: tContent("ZVZ"),
                      }}
                      busy={busy}
                      onChannel={(channelId) =>
                        void postAction({
                          action: "set-channel",
                          feed: "deaths",
                          channelId,
                        })
                      }
                      onFilters={(patch) =>
                        void postAction({
                          action: "filters",
                          feed: "deaths",
                          ...patch,
                        })
                      }
                      onPingRole={(roleId) =>
                        void postAction({
                          action: "ping-role",
                          feed: "deaths",
                          roleId,
                        })
                      }
                      onTest={() =>
                        void postAction({ action: "test-post", feed: "deaths" })
                      }
                    />
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </DiscordFeedsShell>
  );
}

function channelLabel(
  channelId: string | null | undefined,
  channels?: Array<{ id: string; name: string }>
): string | null {
  if (!channelId) return null;
  const match = channels?.find((channel) => channel.id === channelId);
  return match ? `#${match.name}` : `#${channelId}`;
}

function FeedEditor({
  title,
  icon: Icon,
  feed,
  channelOptions,
  roles,
  contentLabel,
  contentLabels,
  busy,
  onChannel,
  onFilters,
  onPingRole,
  onTest,
}: {
  title: string;
  icon: typeof Swords;
  feed: FeedSummary | undefined;
  channelOptions: Array<{ value: string; label: string }>;
  roles: Array<{ id: string; name: string }>;
  contentLabel: string;
  contentLabels: Record<(typeof CONTENT_OPTIONS)[number], string>;
  busy: boolean;
  onChannel: (channelId: string) => void;
  onFilters: (patch: {
    minFame: number | null;
    minSilver: number | null;
    contentTypes: string[];
    paused: boolean;
  }) => void;
  onPingRole: (roleId: string | null) => void;
  onTest: () => void;
}) {
  const t = useTranslations("Discord.feeds");
  const filters: DiscordFeedFilters = feed?.filters ?? {};
  const [minFame, setMinFame] = useState(String(filters.minFame ?? 0));
  const [minSilver, setMinSilver] = useState(String(filters.minSilver ?? 0));
  const [content, setContent] = useState<string[]>(filters.contentTypes ?? []);
  const [paused, setPaused] = useState(Boolean(filters.paused));

  useEffect(() => {
    setMinFame(String(filters.minFame ?? 0));
    setMinSilver(String(filters.minSilver ?? 0));
    setContent(filters.contentTypes ?? []);
    setPaused(Boolean(filters.paused));
  }, [
    feed?.id,
    filters.minFame,
    filters.minSilver,
    filters.paused,
    filters.contentTypes,
  ]);

  if (!feed) return null;

  return (
    <Card className={cn(ACCOUNT_CARD, "h-full")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-base text-foreground/90">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm sm:col-span-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Hash className="h-3 w-3" aria-hidden />
              {t("channel")}
            </span>
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              value={feed.channelId ?? ""}
              disabled={busy}
              onChange={(event) => {
                if (event.target.value) onChannel(event.target.value);
              }}
            >
              {channelOptions.map((option) => (
                <option key={option.value || "none"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("minFame")}
            </span>
            <input
              type="number"
              min={0}
              value={minFame}
              onChange={(event) => setMinFame(event.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:opacity-60"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("minSilver")}
            </span>
            <input
              type="number"
              min={0}
              value={minSilver}
              onChange={(event) => setMinSilver(event.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:opacity-60"
            />
          </label>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {contentLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {CONTENT_OPTIONS.map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={content.includes(value) ? "default" : "outline"}
                onClick={() =>
                  setContent((prev) =>
                    prev.includes(value)
                      ? prev.filter((item) => item !== value)
                      : [...prev, value]
                  )
                }
              >
                {contentLabels[value]}
              </Button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={paused}
            onChange={(event) => setPaused(event.target.checked)}
          />
          {t("paused")}
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("pingRole")}
          </span>
          <select
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            value={filters.pingRoleId ?? ""}
            disabled={busy}
            onChange={(event) => onPingRole(event.target.value || null)}
          >
            <option value="">{t("pingRoleNone")}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() =>
              onFilters({
                minFame: Number(minFame) || null,
                minSilver: Number(minSilver) || null,
                contentTypes: content,
                paused,
              })
            }
          >
            {t("saveFilters")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !feed.channelId}
            onClick={onTest}
          >
            {t("testPost")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
