"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FeedFilters = {
  minFame?: number;
  minSilver?: number;
  contentTypes?: string[];
  paused?: boolean;
};

type DiscordFeedRow = {
  id: string;
  discordGuildId: string;
  feedType: string;
  targetName: string | null;
  region: string;
  channelId: string | null;
  filters: FeedFilters;
  enabled: number;
  serverName: string | null;
};

export function DiscordFeedsPanel() {
  const [feeds, setFeeds] = useState<DiscordFeedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/discord/feeds", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load feeds");
      const data = (await res.json()) as { feeds?: DiscordFeedRow[] };
      setFeeds(data.feeds ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feeds");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(feed: DiscordFeedRow, filters: FeedFilters) {
    setSavingId(feed.id);
    try {
      const res = await fetch("/api/admin/discord/feeds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: feed.id, filters }),
      });
      if (!res.ok) throw new Error("Failed to save filters");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save filters");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Discord feed filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-danger-foreground">{error}</p>}
        {feeds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Discord feeds stored.</p>
        ) : (
          <div className="space-y-3">
            {feeds.map((feed) => (
              <FeedEditor
                key={feed.id}
                feed={feed}
                saving={savingId === feed.id}
                onSave={save}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeedEditor({
  feed,
  saving,
  onSave,
}: {
  feed: DiscordFeedRow;
  saving: boolean;
  onSave: (feed: DiscordFeedRow, filters: FeedFilters) => void;
}) {
  const [minFame, setMinFame] = useState(String(feed.filters.minFame ?? 0));
  const [minSilver, setMinSilver] = useState(String(feed.filters.minSilver ?? 0));
  const [content, setContent] = useState(
    (feed.filters.contentTypes ?? []).join(",")
  );
  const [paused, setPaused] = useState(Boolean(feed.filters.paused));

  return (
    <div className="space-y-2 rounded-md border border-border/60 p-3">
      <p className="text-sm font-medium">
        {feed.serverName ?? feed.discordGuildId} · {feed.targetName ?? "?"} ·{" "}
        {feed.feedType} · {feed.region}
      </p>
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Min fame</span>
          <input
            type="number"
            min={0}
            value={minFame}
            onChange={(event) => setMinFame(event.target.value)}
            className="h-8 w-full rounded-md border border-border bg-background px-2"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Min silver</span>
          <input
            type="number"
            min={0}
            value={minSilver}
            onChange={(event) => setMinSilver(event.target.value)}
            className="h-8 w-full rounded-md border border-border bg-background px-2"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Content</span>
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="SOLO,GROUP,ZVZ"
            className="h-8 w-full rounded-md border border-border bg-background px-2"
          />
        </label>
        <label className="flex items-end gap-2 pb-1 text-xs">
          <input
            type="checkbox"
            checked={paused}
            onChange={(event) => setPaused(event.target.checked)}
          />
          Paused
        </label>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={saving}
        onClick={() =>
          onSave(feed, {
            minFame: Number(minFame) || 0,
            minSilver: Number(minSilver) || 0,
            contentTypes: content
              .split(/[,\s]+/)
              .map((value) => value.trim().toUpperCase())
              .filter(Boolean),
            paused,
          })
        }
      >
        {saving ? "Saving…" : "Save filters"}
      </Button>
    </div>
  );
}
