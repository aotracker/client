"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  parseLeaderboardTab,
  type LeaderboardTab,
} from "@/lib/leaderboards/params";
import {
  applyFeedRegionParam,
  rememberFeedRegionSelection,
} from "@/lib/region-params";

type PushUpdates = Record<string, string | undefined>;

interface LeaderboardNavigationContextValue {
  isPending: boolean;
  pendingTab: LeaderboardTab | null;
  push: (updates: PushUpdates) => void;
}

const LeaderboardNavigationContext =
  createContext<LeaderboardNavigationContextValue | null>(null);

export function useLeaderboardNavigation() {
  const ctx = useContext(LeaderboardNavigationContext);
  if (!ctx) {
    throw new Error(
      "useLeaderboardNavigation must be used within LeaderboardNavigationProvider"
    );
  }
  return ctx;
}

function buildLeaderboardHref(
  searchParams: URLSearchParams,
  updates: PushUpdates
): string {
  const params = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;

    if (key === "region") {
      applyFeedRegionParam(params, value);
      continue;
    }

    if (
      !value ||
      (key === "days" && value === "7") ||
      (key === "tab" && value === "killers") ||
      (key === "type" && value === "all")
    ) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `/leaderboards?${query}` : "/leaderboards";
}

export function LeaderboardNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingTab, setPendingTab] = useState<LeaderboardTab | null>(null);

  useEffect(() => {
    if (!isPending) {
      setPendingTab(null);
    }
  }, [isPending]);

  function push(updates: PushUpdates) {
    if (updates.region) {
      rememberFeedRegionSelection(updates.region);
    }
    if (updates.tab) {
      setPendingTab(parseLeaderboardTab(updates.tab));
    }
    startTransition(() => {
      router.push(buildLeaderboardHref(searchParams, updates));
    });
  }

  return (
    <LeaderboardNavigationContext.Provider
      value={{ isPending, pendingTab, push }}
    >
      {children}
    </LeaderboardNavigationContext.Provider>
  );
}

export function LeaderboardResultsPending({
  children,
}: {
  children: ReactNode;
}) {
  const { isPending } = useLeaderboardNavigation();

  if (isPending) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center py-12"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2
          className="h-8 w-8 animate-spin text-muted-foreground"
          aria-hidden
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Loading leaderboard…
        </p>
      </div>
    );
  }

  return children;
}
