"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { useSession } from "@/lib/auth-client";
import { toPublicAuthUser, type PublicAuthUser } from "@/lib/auth-user";

const SessionSnapshotContext = createContext<PublicAuthUser | null | undefined>(
  undefined
);

export function SessionSnapshotProvider({
  user,
  children,
}: {
  user: PublicAuthUser | null;
  children: React.ReactNode;
}) {
  return (
    <SessionSnapshotContext.Provider value={user}>
      {children}
    </SessionSnapshotContext.Provider>
  );
}

function subscribeHydrated() {
  return () => {};
}

/** False on the server and during hydration; true after the client commits. */
export function useHydrated() {
  return useSyncExternalStore(subscribeHydrated, () => true, () => false);
}

/**
 * Auth user that matches SSR: uses the layout session snapshot until the
 * client session store has resolved (and during the first hydration pass).
 */
export function useAuthUser() {
  const initialUser = useContext(SessionSnapshotContext);
  const { data: session, isPending, error, refetch, isRefetching } =
    useSession();
  const hydrated = useHydrated();

  const fromSession = session?.user
    ? toPublicAuthUser(session.user)
    : null;
  const merged =
    fromSession && initialUser && fromSession.id === initialUser.id
      ? {
          ...fromSession,
          isAdmin: fromSession.isAdmin || initialUser.isAdmin,
          providers:
            fromSession.providers.length > 0
              ? fromSession.providers
              : initialUser.providers,
        }
      : fromSession;

  const user = !hydrated
    ? (initialUser ?? null)
    : merged
      ? merged
      : isPending
        ? (initialUser ?? null)
        : null;

  const sessionPending =
    user == null && (hydrated ? isPending : initialUser === undefined);

  return {
    user,
    session,
    isPending: sessionPending,
    hydrated,
    error,
    refetch,
    isRefetching,
  };
}
