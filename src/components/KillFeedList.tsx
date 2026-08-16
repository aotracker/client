"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ChevronsDown, FilterX, Pause, Play } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { KillCard } from "@/components/KillCard";
import { Button } from "@/components/ui/button";
import type { AlbionRegion } from "@/lib/albion/types";
import type { ContentTypeFilter } from "@/lib/db/queries";
import {
  serializeWatchlistRefs,
  watchlistRefsByType,
} from "@/lib/kills-feed-params";
import { useWatchlist } from "@/components/watchlist/useWatchlist";

export type KillFeedEvent = {
  eventId: number;
  region: string;
  occurredAt: Date | string;
  contentType: string;
  totalVictimKillFame: number | null;
  killer?: {
    albionId: string;
    name: string;
    guild?: { name: string; albionId?: string } | null;
    allianceTag?: string | null;
  } | null;
  victim?: {
    albionId: string;
    name: string;
    guild?: { name: string; albionId?: string } | null;
    allianceTag?: string | null;
  } | null;
  items?: {
    ownerRole: string;
    slot: string | null;
    itemType: string;
    quality: number | null;
    category: string;
    displayNames?: Record<string, string>;
  }[];
  participants?: {
    role: string;
    averageItemPower: string | null;
  }[];
};

interface KillFeedListProps {
  initialEvents: KillFeedEvent[];
  region: AlbionRegion | "all";
  contentType: ContentTypeFilter;
  pageSize: number;
  /** Home preview: no load-more, capped to initial page size, always buffers new kills */
  preview?: boolean;
  minFame?: number;
  watchlistOnly?: boolean;
  onPollAtChange?: (at: Date) => void;
  onPausedChange?: (paused: boolean) => void;
}

const POLL_MS = 20_000;
const MAX_EVENTS = 150;

function eventKey(event: KillFeedEvent): string {
  return `${event.region}-${event.eventId}`;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function KillFeedList({
  initialEvents,
  region,
  contentType,
  pageSize,
  preview = false,
  minFame = 0,
  watchlistOnly = false,
  onPollAtChange,
  onPausedChange,
}: KillFeedListProps) {
  const t = useTranslations("Kill.feed");
  const { entries, ready } = useWatchlist();
  const maxEvents = preview ? pageSize : MAX_EVENTS;
  const [events, setEvents] = useState(initialEvents);
  const [offset, setOffset] = useState(initialEvents.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    !preview && initialEvents.length >= pageSize
  );
  const [error, setError] = useState<string | null>(null);
  const [pendingNew, setPendingNew] = useState<KillFeedEvent[]>([]);
  const [nearTop, setNearTop] = useState(true);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const loadingRef = useRef(false);
  const listTopRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef(events);
  const nearTopRef = useRef(nearTop);
  const pausedRef = useRef(paused);
  const hoveringRef = useRef(hovering);
  const watchlistReady = !watchlistOnly || ready;

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    nearTopRef.current = nearTop;
  }, [nearTop]);

  useEffect(() => {
    pausedRef.current = paused;
    onPausedChange?.(paused);
  }, [onPausedChange, paused]);

  useEffect(() => {
    hoveringRef.current = hovering;
  }, [hovering]);

  useEffect(() => {
    function onScroll() {
      const top = listTopRef.current?.getBoundingClientRect().top ?? 0;
      setNearTop(top > -80);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const appendFeedParams = useCallback(
    (params: URLSearchParams) => {
      if (region !== "all") params.set("region", region);
      if (contentType !== "all") params.set("type", contentType);
      if (minFame > 0) params.set("minFame", String(minFame));
      if (watchlistOnly) {
        const refs = watchlistRefsByType(entries);
        params.set("players", serializeWatchlistRefs(refs.players));
        params.set("guilds", serializeWatchlistRefs(refs.guilds));
        params.set("alliances", serializeWatchlistRefs(refs.alliances));
      }
    },
    [contentType, entries, minFame, region, watchlistOnly]
  );

  const pollNew = useCallback(async () => {
    if (loadingRef.current) return;
    if (pausedRef.current) return;
    if (!watchlistReady) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }

    const currentEvents = eventsRef.current;
    const newest = currentEvents[0];
    if (!newest) return;

    try {
      const occurredAt = toDate(newest.occurredAt);
      const params = new URLSearchParams({
        limit: "20",
        after: occurredAt.toISOString(),
        afterEventId: String(newest.eventId),
      });
      appendFeedParams(params);

      const res = await fetch(`/api/kills?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = (await res.json()) as { events?: KillFeedEvent[] };
      const incoming = data.events ?? [];
      const polledAt = new Date();
      onPollAtChange?.(polledAt);
      if (incoming.length === 0) return;

      const existing = new Set(currentEvents.map(eventKey));
      const fresh = incoming.filter((e) => !existing.has(eventKey(e)));
      if (fresh.length === 0) return;

      const shouldBuffer =
        preview || hoveringRef.current || !nearTopRef.current;

      if (!shouldBuffer) {
        const freshKeys = fresh.map(eventKey);
        setFreshIds(new Set(freshKeys));
        window.setTimeout(() => setFreshIds(new Set()), 400);
        setEvents((prev) => {
          const keys = new Set(prev.map(eventKey));
          const merged = [...fresh.filter((e) => !keys.has(eventKey(e))), ...prev];
          return merged.slice(0, maxEvents);
        });
        setPendingNew([]);
      } else {
        setPendingNew((prev) => {
          const keys = new Set([
            ...prev.map(eventKey),
            ...currentEvents.map(eventKey),
          ]);
          const next = [
            ...fresh.filter((e) => !keys.has(eventKey(e))),
            ...prev,
          ];
          return next.slice(0, 50);
        });
      }
    } catch {
      // soft-fail polls
    }
  }, [appendFeedParams, maxEvents, onPollAtChange, preview, watchlistReady]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void pollNew();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [pollNew]);

  useEffect(() => {
    if (!watchlistOnly || !ready) return;
    let cancelled = false;

    async function reloadWatchlist() {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(pageSize),
          offset: "0",
        });
        appendFeedParams(params);
        const res = await fetch(`/api/kills?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(t("failedLoadMore"));
        const data = (await res.json()) as { events?: KillFeedEvent[] };
        if (cancelled) return;
        const next = data.events ?? [];
        setEvents(next);
        setOffset(next.length);
        setHasMore(!preview && next.length >= pageSize);
        setPendingNew([]);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("failedLoadMore")
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    }

    void reloadWatchlist();
    return () => {
      cancelled = true;
    };
  }, [appendFeedParams, pageSize, preview, ready, t, watchlistOnly]);

  function revealPending() {
    if (pendingNew.length === 0) return;
    const freshKeys = pendingNew.map(eventKey);
    setFreshIds(new Set(freshKeys));
    window.setTimeout(() => setFreshIds(new Set()), 400);
    setEvents((prev) => {
      const keys = new Set(prev.map(eventKey));
      const merged = [
        ...pendingNew.filter((e) => !keys.has(eventKey(e))),
        ...prev,
      ];
      return merged.slice(0, maxEvents);
    });
    setPendingNew([]);
    if (!preview) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    loadingRef.current = true;
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
      });
      appendFeedParams(params);

      const res = await fetch(`/api/kills?${params.toString()}`);
      if (!res.ok) {
        throw new Error(t("failedLoadMore"));
      }

      const data = (await res.json()) as { events?: KillFeedEvent[] };
      const next = data.events ?? [];
      setEvents((prev) => [...prev, ...next].slice(0, maxEvents));
      setOffset((prev) => prev + next.length);
      setHasMore(next.length >= pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedLoadMore"));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  if (events.length === 0 && pendingNew.length === 0) {
    return (
      <EmptyState icon={FilterX}>{t("empty")}</EmptyState>
    );
  }

  return (
    <div
      className="space-y-3"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div ref={listTopRef} />

      <div className="flex flex-wrap items-center justify-center gap-2">
        {pendingNew.length > 0 && (
          <Button type="button" size="sm" variant="outline" onClick={revealPending}>
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
            {t("showNew", { count: pendingNew.length })}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={paused ? "default" : "outline"}
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
        >
          {paused ? (
            <Play className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Pause className="h-3.5 w-3.5" aria-hidden />
          )}
          {paused ? t("resume") : t("pause")}
        </Button>
      </div>

      <div className="space-y-2 stagger-children">
        {events.map((event) => {
          const key = eventKey(event);
          return (
            <div
              key={key}
              className={freshIds.has(key) ? "animate-feed-enter" : undefined}
            >
              <KillCard
                event={{
                  ...event,
                  occurredAt: toDate(event.occurredAt),
                }}
                compact
              />
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-center text-sm text-danger-foreground">{error}</p>
      )}

      {!preview && hasMore && (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loading}
          >
            <ChevronsDown className="h-3.5 w-3.5" aria-hidden />
            {loading ? t("loading") : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
