"use client";

import { useEffect } from "react";

const DEFAULT_MS = 5000;

/** Runs callback on an interval only while the document tab is visible. */
export function useVisibilityAwareInterval(
  callback: () => void,
  intervalMs: number = DEFAULT_MS
) {
  useEffect(() => {
    function tick() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      callback();
    }

    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [callback, intervalMs]);
}
