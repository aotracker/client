import { displayableAccountEmail } from "@/lib/auth-email";
import { getLinkedProviders, getSessionRowId } from "@/lib/auth";
import {
  getUserPreferredRegion,
  getUserSyncedCounts,
  listUserSessions,
} from "@/lib/db/user-data";

export type AccountLinkedAccount = {
  providerId: string;
  accountId: string;
};

export type AccountMe = {
  user: {
    id: string;
    name: string;
    email: string | null;
    image?: string | null;
    isAdmin: boolean;
    preferredRegion?: string | null;
  };
  providers: string[];
  accounts: AccountLinkedAccount[];
  watchlistCount: number;
  recentSearchCount: number;
};

export type AccountSessionSummary = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  current: boolean;
};

export type AccountOverview = {
  me: AccountMe;
  sessions: AccountSessionSummary[];
};

export async function getAccountOverview(
  session: NonNullable<Awaited<ReturnType<typeof import("@/lib/auth").getSession>>>
): Promise<AccountOverview> {
  const userId = session.user.id;
  const currentId = getSessionRowId(session);
  const [providers, preferredRegion, counts, sessionRows] = await Promise.all([
    getLinkedProviders(userId),
    getUserPreferredRegion(userId),
    getUserSyncedCounts(userId),
    listUserSessions(userId, currentId),
  ]);
  const providerIds = providers.map((p) => p.providerId);

  return {
    me: {
      user: {
        id: userId,
        name: session.user.name,
        email: displayableAccountEmail(session.user.email, providerIds),
        image: session.user.image,
        isAdmin: Boolean((session.user as { isAdmin?: boolean }).isAdmin),
        preferredRegion,
      },
      providers: providerIds,
      accounts: providers,
      watchlistCount: counts.watchlistCount,
      recentSearchCount: counts.recentSearchCount,
    },
    sessions: sessionRows.map((row) => ({
      id: row.id,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      current: row.current,
    })),
  };
}
