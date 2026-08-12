"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { AlertTriangle, X } from "lucide-react";

const DISMISS_KEY = "aotrackr:status-banner-dismissed";

type DismissRecord = {
  message: string;
  at: number;
};

function readDismissed(): DismissRecord | null {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DismissRecord;
  } catch {
    return null;
  }
}

interface StatusBannerClientProps {
  message: string;
}

export function StatusBannerClient({ message }: StatusBannerClientProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = readDismissed();
    setVisible(!dismissed || dismissed.message !== message);
  }, [message]);

  if (!visible) return null;

  return (
    <div
      className="alert-warning border-x-0 border-t-0 px-4 py-2"
      role="status"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-2 text-sm sm:items-center">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" aria-hidden />
        <p className="min-w-0 flex-1">
          <span>{message}</span>{" "}
          <Link
            href="/health"
            className="font-medium underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            System status
          </Link>
        </p>
        <button
          type="button"
          className="shrink-0 rounded-sm p-0.5 text-warning-foreground/80 transition-colors hover:bg-warning/15 hover:text-warning-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Dismiss status banner"
          onClick={() => {
            try {
              localStorage.setItem(
                DISMISS_KEY,
                JSON.stringify({ message, at: Date.now() } satisfies DismissRecord)
              );
            } catch {
              // ignore
            }
            setVisible(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
