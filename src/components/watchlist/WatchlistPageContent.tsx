"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { KillCard } from "@/components/KillCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KillCardSkeleton } from "@/components/ui/skeleton";
import type { KillCardEvent } from "@/lib/albion/player-history";
import { entityHref, type WatchlistEntry } from "@/lib/watchlist";
import { regionLabel } from "@/lib/utils";
import { useWatchlist } from "./useWatchlist";

export function WatchlistPageContent() {
  const { entries, ready, remove } = useWatchlist();
  const [activity, setActivity] = useState<KillCardEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async (list: WatchlistEntry[]) => {
    if (list.length === 0) {
      setActivity([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: list
            .filter((e) => e.type === "player")
            .map((e) => ({ region: e.region, albionId: e.albionId })),
          guilds: list
            .filter((e) => e.type === "guild")
            .map((e) => ({ region: e.region, albionId: e.albionId })),
        }),
      });
      if (!res.ok) throw new Error("Failed to load activity");
      const data = (await res.json()) as { events: KillCardEvent[] };
      setActivity(data.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadActivity(entries);
  }, [ready, entries, loadActivity]);

  if (!ready) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <KillCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No watched players or guilds yet. Use the Watch button on a player or
          guild profile to pin them here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Pinned ({entries.length})</h2>
        <ul className="divide-y divide-border/60 overflow-hidden rounded-md border border-border/60 bg-card/40">
          {entries.map((entry) => (
            <li
              key={`${entry.type}-${entry.region}-${entry.albionId}`}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <Link
                  href={entityHref(entry)}
                  className="truncate text-sm font-medium hover:text-primary hover:underline"
                >
                  {entry.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {entry.type === "player" ? "Player" : "Guild"} ·{" "}
                  {regionLabel(entry.region)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => remove(entry.type, entry.region, entry.albionId)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent activity</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <KillCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="alert-danger rounded-md p-4 text-sm">{error}</div>
        ) : activity.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No recent kills involving your watchlist
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activity.map((event) => (
              <KillCard
                key={`${event.region}-${event.eventId}`}
                event={event}
                compact
                compactSize="large"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
