"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ChevronsDown, FilterX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { KillCard } from "@/components/KillCard";
import { Button } from "@/components/ui/button";
import type { AlbionRegion } from "@/lib/albion/types";
import type { ContentTypeFilter } from "@/lib/db/queries";

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
  /** Home preview: no load-more, capped to initial page size */
  preview?: boolean;
  onPollAtChange?: (at: Date) => void;
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
  onPollAtChange,
}: KillFeedListProps) {
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
  const loadingRef = useRef(false);
  const listTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      const top = listTopRef.current?.getBoundingClientRect().top ?? 0;
      setNearTop(top > -80);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const pollNew = useCallback(async () => {
    if (loadingRef.current) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }

    const newest = events[0];
    if (!newest) return;

    try {
      const occurredAt = toDate(newest.occurredAt);
      const params = new URLSearchParams({
        limit: "20",
        after: occurredAt.toISOString(),
        afterEventId: String(newest.eventId),
      });
      if (region !== "all") params.set("region", region);
      if (contentType !== "all") params.set("type", contentType);

      const res = await fetch(`/api/kills?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = (await res.json()) as { events?: KillFeedEvent[] };
      const incoming = data.events ?? [];
      const polledAt = new Date();
      onPollAtChange?.(polledAt);
      if (incoming.length === 0) return;

      const existing = new Set(events.map(eventKey));
      const fresh = incoming.filter((e) => !existing.has(eventKey(e)));
      if (fresh.length === 0) return;

      if (nearTop) {
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
            ...events.map(eventKey),
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
  }, [contentType, events, maxEvents, nearTop, onPollAtChange, region]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void pollNew();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [pollNew]);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      if (region !== "all") params.set("region", region);
      if (contentType !== "all") params.set("type", contentType);

      const res = await fetch(`/api/kills?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load more kills");
      }

      const data = (await res.json()) as { events?: KillFeedEvent[] };
      const next = data.events ?? [];
      setEvents((prev) => [...prev, ...next].slice(0, maxEvents));
      setOffset((prev) => prev + next.length);
      setHasMore(next.length >= pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more kills");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  if (events.length === 0) {
    return (
      <EmptyState icon={FilterX}>No kills match these filters</EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={listTopRef} />

      {pendingNew.length > 0 && (
        <div className="flex justify-center">
          <Button type="button" size="sm" variant="outline" onClick={revealPending}>
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
            {pendingNew.length} new kill{pendingNew.length === 1 ? "" : "s"} — show
          </Button>
        </div>
      )}

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
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
