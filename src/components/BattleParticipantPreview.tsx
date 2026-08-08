"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { BattlesFeedParticipant } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

function formatNames(items: BattlesFeedParticipant[]): string {
  return items.map((item) => item.name).join(" · ");
}

interface BattleParticipantPreviewProps {
  label: string;
  items: BattlesFeedParticipant[];
  className?: string;
}

/**
 * Renders "Alliances: A · B · C" (or Guilds), fitting as many names as the
 * line width allows. Shows "+N" only when some names are hidden due to overflow.
 */
export function BattleParticipantPreview({
  label,
  items,
  className,
}: BattleParticipantPreviewProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);

  const fit = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure || items.length === 0) {
      setVisibleCount(items.length);
      return;
    }

    const available = container.clientWidth;
    if (available <= 0) return;

    const prefix = `${label}: `;

    // Fast path: everything fits with no overflow suffix.
    measure.textContent = prefix + formatNames(items);
    if (measure.scrollWidth <= available) {
      setVisibleCount(items.length);
      return;
    }

    let low = 0;
    let high = items.length;
    let best = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const hidden = items.length - mid;
      const names = formatNames(items.slice(0, mid));
      measure.textContent =
        hidden > 0
          ? `${prefix}${names}${names ? " " : ""}+${hidden}`
          : `${prefix}${names}`;

      if (measure.scrollWidth <= available) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    setVisibleCount(best);
  }, [items, label]);

  useLayoutEffect(() => {
    fit();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(container);
    return () => observer.disconnect();
  }, [fit]);

  if (items.length === 0) return null;

  const visible = items.slice(0, visibleCount);
  const hidden = items.length - visibleCount;

  return (
    <p ref={containerRef} className={cn("relative min-w-0 truncate", className)}>
      <span className="font-medium text-muted-foreground">{label}: </span>
      {visible.map((item, index) => (
        <span key={item.id}>
          {index > 0 && <span className="text-muted-foreground/50"> · </span>}
          <span>{item.name}</span>
        </span>
      ))}
      {hidden > 0 && (
        <span className="font-normal text-muted-foreground"> +{hidden}</span>
      )}
      {/* Off-screen measurer mirrors font styles via inheritance. */}
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
      />
    </p>
  );
}
