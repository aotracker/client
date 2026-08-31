"use client";

import { useCallback, useEffect, useState } from "react";
import { Radio, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import { MediaPlatformIcon } from "@/components/media/MediaPlatformIcon";
import { ENABLED_REGIONS, type AlbionRegion } from "@/lib/albion/types";
import { regionLabel } from "@/lib/utils";
import type { MediaPlatform } from "@/lib/media/urls";

type ResolvedChannel = {
  platform: MediaPlatform;
  channelId: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
};

type PlayerLink = {
  id: string;
  region: AlbionRegion;
  playerAlbionId: string;
  playerName: string;
  platform: MediaPlatform;
  channelId: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
};

type GuildPin = {
  id: string;
  region: AlbionRegion;
  guildAlbionId: string;
  guildName: string;
  platform: MediaPlatform;
  channelId: string;
  login: string;
  displayName: string;
  avatarUrl: string | null;
};

type SearchHit = {
  albionId: string;
  name: string;
  region: AlbionRegion;
};

const PLATFORM_OPTIONS: Array<{ value: MediaPlatform; label: string }> = [
  { value: "twitch", label: "Twitch" },
  { value: "youtube", label: "YouTube" },
];

const PLATFORM_ORDER: MediaPlatform[] = ["twitch", "youtube"];

function platformLabel(platform: MediaPlatform): string {
  return platform === "twitch" ? "Twitch" : "YouTube";
}

function groupByEntity<T extends { platform: MediaPlatform }>(
  rows: T[],
  entityKey: (row: T) => string
): T[][] {
  const groups = new Map<string, T[]>();
  const order: string[] = [];
  for (const row of rows) {
    const key = entityKey(row);
    const existing = groups.get(key);
    if (existing) {
      existing.push(row);
      continue;
    }
    groups.set(key, [row]);
    order.push(key);
  }
  return order.map((key) =>
    [...(groups.get(key) ?? [])].sort(
      (a, b) =>
        PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform)
    )
  );
}

export function AdminMediaPanel() {
  const [players, setPlayers] = useState<PlayerLink[]>([]);
  const [guilds, setGuilds] = useState<GuildPin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [target, setTarget] = useState<"player" | "guild">("player");
  const [region, setRegion] = useState<AlbionRegion>(
    ENABLED_REGIONS[0] ?? "americas"
  );
  const [entityQuery, setEntityQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [platform, setPlatform] = useState<MediaPlatform>("twitch");
  const [channelQuery, setChannelQuery] = useState("");
  const [preview, setPreview] = useState<ResolvedChannel | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/media", { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load media links.");
      return;
    }
    const data = (await res.json()) as {
      players?: PlayerLink[];
      guilds?: GuildPin[];
    };
    setPlayers(Array.isArray(data.players) ? data.players : []);
    setGuilds(Array.isArray(data.guilds) ? data.guilds : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const q = entityQuery.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const id = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q,
          region,
          limit: "8",
        });
        const res = await fetch(`/api/search?${params}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          local?: { players?: SearchHit[]; guilds?: SearchHit[] };
        };
        const list =
          target === "guild" ? data.local?.guilds : data.local?.players;
        setHits(
          (Array.isArray(list) ? list : [])
            .filter((hit) => hit.region === region)
            .slice(0, 8)
        );
      } catch {
        setHits([]);
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [entityQuery, region, target]);

  async function resolveChannel() {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/admin/media/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, query: channelQuery }),
      });
      const data = (await res.json()) as ResolvedChannel & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not resolve channel.");
        return;
      }
      setPreview(data);
    } catch {
      setError("Could not resolve channel.");
    } finally {
      setBusy(false);
    }
  }

  async function attach() {
    if (!selected || !preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "attach",
          target,
          region: selected.region,
          albionId: selected.albionId,
          platform: preview.platform,
          channelId: preview.channelId,
          login: preview.login,
          displayName: preview.displayName,
          avatarUrl: preview.avatarUrl,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Attach failed.");
        return;
      }
      setChannelQuery("");
      setPreview(null);
      await load();
    } catch {
      setError("Attach failed.");
    } finally {
      setBusy(false);
    }
  }

  async function unlink(id: string, kind: "player" | "guild") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink", target: kind, id }),
      });
      if (!res.ok) {
        setError("Unlink failed.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  const playerGroups = groupByEntity(
    players,
    (link) => `${link.region}:${link.playerAlbionId}`
  );
  const guildGroups = groupByEntity(
    guilds,
    (pin) => `${pin.region}:${pin.guildAlbionId}`
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media"
        description="Attach public Twitch or YouTube channels to Albion players and guilds. Streamers do not need an AOTracker account."
      />

      {error ? (
        <p className="text-sm text-danger-foreground">{error}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attach channel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <FilterSelect
              label="Target"
              value={target}
              onChange={(value) => {
                setTarget(value);
                setSelected(null);
                setHits([]);
                setEntityQuery("");
              }}
              options={[
                { value: "player", label: "Player" },
                { value: "guild", label: "Guild" },
              ]}
            />
            <FilterSelect
              label="Region"
              value={region}
              onChange={(value) => {
                setRegion(value);
                setSelected(null);
              }}
              options={ENABLED_REGIONS.map((value) => ({
                value,
                label: regionLabel(value),
              }))}
            />
            <FilterSelect
              label="Platform"
              value={platform}
              onChange={(value) => {
                setPlatform(value);
                setPreview(null);
              }}
              options={PLATFORM_OPTIONS}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {target === "guild" ? "Guild" : "Player"}
              </span>
              <Input
                size="sm"
                placeholder="Search name"
                value={entityQuery}
                onChange={(event) => {
                  setEntityQuery(event.target.value);
                  setSelected(null);
                }}
              />
              {hits.length > 0 && !selected ? (
                <ul className="overflow-hidden rounded-md border border-border/60">
                  {hits.map((hit) => (
                    <li key={`${hit.region}-${hit.albionId}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto w-full justify-between rounded-none px-3 py-2"
                        onClick={() => {
                          setSelected(hit);
                          setEntityQuery(hit.name);
                          setHits([]);
                        }}
                      >
                        <span>{hit.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {regionLabel(hit.region)}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {selected ? (
                <p className="text-xs text-muted-foreground">
                  Selected {selected.name} · {selected.albionId}
                </p>
              ) : null}
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {platform === "twitch" ? "Twitch login or URL" : "YouTube handle or URL"}
              </span>
              <div className="flex gap-2">
                <Input
                  size="sm"
                  placeholder={
                    platform === "twitch" ? "twitch.tv/name" : "youtube.com/@handle"
                  }
                  value={channelQuery}
                  onChange={(event) => {
                    setChannelQuery(event.target.value);
                    setPreview(null);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || !channelQuery.trim()}
                  onClick={() => void resolveChannel()}
                >
                  <Search className="h-3.5 w-3.5" aria-hidden />
                  Preview
                </Button>
              </div>
              {preview ? (
                <div className="flex items-center gap-2 text-sm">
                  {preview.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-md"
                    />
                  ) : null}
                  <span>
                    {preview.displayName}{" "}
                    <span className="text-muted-foreground">
                      ({preview.login})
                    </span>
                  </span>
                </div>
              ) : null}
            </label>
          </div>

          <Button
            type="button"
            size="sm"
            disabled={busy || !selected || !preview}
            onClick={() => void attach()}
          >
            Save link
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4" aria-hidden />
            Player links ({playerGroups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {playerGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No player channels yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {playerGroups.map((group) => {
                const first = group[0];
                return (
                  <li
                    key={`${first.region}-${first.playerAlbionId}`}
                    className="space-y-2 py-2.5"
                  >
                    <p className="truncate text-sm font-medium">
                      {first.playerName}{" "}
                      <span className="text-muted-foreground">
                        · {regionLabel(first.region)}
                      </span>
                    </p>
                    <ul className="grid grid-cols-2 gap-2">
                      {group.map((link) => (
                        <li key={link.id} className="min-w-0">
                          <Card variant="muted">
                            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <MediaPlatformIcon
                                  platform={link.platform}
                                  label={platformLabel(link.platform)}
                                />
                                <p className="min-w-0 truncate text-sm text-muted-foreground">
                                  {link.displayName} ({link.login})
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => void unlink(link.id, "player")}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                Unlink
                              </Button>
                            </CardContent>
                          </Card>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Guild pins ({guildGroups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {guildGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guild pins yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {guildGroups.map((group) => {
                const first = group[0];
                return (
                  <li
                    key={`${first.region}-${first.guildAlbionId}`}
                    className="space-y-2 py-2.5"
                  >
                    <p className="truncate text-sm font-medium">
                      {first.guildName}{" "}
                      <span className="text-muted-foreground">
                        · {regionLabel(first.region)}
                      </span>
                    </p>
                    <ul className="grid grid-cols-2 gap-2">
                      {group.map((pin) => (
                        <li key={pin.id} className="min-w-0">
                          <Card variant="muted">
                            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <MediaPlatformIcon
                                  platform={pin.platform}
                                  label={platformLabel(pin.platform)}
                                />
                                <p className="min-w-0 truncate text-sm text-muted-foreground">
                                  {pin.displayName} ({pin.login})
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => void unlink(pin.id, "guild")}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                Unlink
                              </Button>
                            </CardContent>
                          </Card>
                        </li>
                      ))}
                    </ul>
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
