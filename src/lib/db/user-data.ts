import { and, count, desc, eq, gt, ne, max, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import {
  getPlayerByAlbionId,
  getPlayerByNameCaseInsensitive,
} from "@/lib/db/queries/entities";
import {
  uniqueWatchlistEntries,
  type WatchlistEntry,
  type WatchlistEntityType,
} from "@/lib/watchlist";
import type { RecentSearch } from "@/lib/search/recent-searches";
import {
  isPreferredRegion,
  type PreferredRegion,
} from "@/lib/region-preference";
import { isSyntheticDiscordEmail } from "@/lib/auth-email";

const MAX_RECENT = 8;

const WATCHLIST_TYPES = new Set<WatchlistEntityType>([
  "player",
  "guild",
  "alliance",
]);

function isWatchlistType(value: string): value is WatchlistEntityType {
  return WATCHLIST_TYPES.has(value as WatchlistEntityType);
}

export async function getUserWatchlist(userId: string): Promise<WatchlistEntry[]> {
  const rows = await db
    .select()
    .from(schema.userWatchlistEntries)
    .where(eq(schema.userWatchlistEntries.userId, userId));

  return rows
    .filter((row) => isWatchlistType(row.type) && isRegionEnabled(row.region))
    .map((row) => ({
      type: row.type as WatchlistEntityType,
      region: row.region as AlbionRegion,
      albionId: row.albionId,
      name: row.name,
      addedAt: row.addedAt.toISOString(),
    }));
}

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function lockUserRow(tx: DbTx, userId: string) {
  await tx
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .for("update");
}

export async function replaceUserWatchlist(
  userId: string,
  entries: WatchlistEntry[]
): Promise<WatchlistEntry[]> {
  const cleaned = uniqueWatchlistEntries(
    entries.filter(
      (e) =>
        isWatchlistType(e.type) &&
        isRegionEnabled(e.region) &&
        typeof e.albionId === "string" &&
        e.albionId.length > 0 &&
        typeof e.name === "string"
    )
  );

  await db.transaction(async (tx) => {
    // Serialize concurrent replace-all writes. Without this lock, two
    // delete+insert transactions can both pass DELETE and then collide on
    // user_watchlist_entries_unique_idx (23505).
    await lockUserRow(tx, userId);
    await tx
      .delete(schema.userWatchlistEntries)
      .where(eq(schema.userWatchlistEntries.userId, userId));
    if (cleaned.length === 0) return;
    await tx.insert(schema.userWatchlistEntries).values(
      cleaned.map((e) => ({
        userId,
        type: e.type,
        region: e.region,
        albionId: e.albionId,
        name: e.name,
        addedAt: e.addedAt ? new Date(e.addedAt) : new Date(),
      }))
    );
  });

  return cleaned;
}

export function mergeWatchlistEntries(
  server: WatchlistEntry[],
  local: WatchlistEntry[]
): WatchlistEntry[] {
  return uniqueWatchlistEntries([...server, ...local]);
}

export async function getUserRecentSearches(
  userId: string
): Promise<RecentSearch[]> {
  const rows = await db
    .select()
    .from(schema.userRecentSearches)
    .where(eq(schema.userRecentSearches.userId, userId))
    .orderBy(desc(schema.userRecentSearches.searchedAt))
    .limit(MAX_RECENT);

  return rows
    .filter((row) => isPreferredRegion(row.region))
    .map((row) => ({
      q: row.q,
      region: row.region as PreferredRegion,
      type: (row.type as RecentSearch["type"]) ?? undefined,
      path: row.path ?? undefined,
      ts: row.searchedAt.getTime(),
    }));
}

export async function replaceUserRecentSearches(
  userId: string,
  entries: RecentSearch[]
): Promise<RecentSearch[]> {
  const cleaned = entries
    .filter(
      (e) =>
        isPreferredRegion(e.region) &&
        (Boolean(e.q?.trim()) || Boolean(e.path))
    )
    .slice(0, MAX_RECENT);

  await db.transaction(async (tx) => {
    await lockUserRow(tx, userId);
    await tx
      .delete(schema.userRecentSearches)
      .where(eq(schema.userRecentSearches.userId, userId));
    if (cleaned.length === 0) return;
    await tx.insert(schema.userRecentSearches).values(
      cleaned.map((e) => ({
        userId,
        q: e.q?.trim() ?? "",
        region: e.region,
        type: e.type ?? null,
        path: e.path ?? null,
        searchedAt: new Date(e.ts || Date.now()),
      }))
    );
  });

  return cleaned;
}

export function mergeRecentSearches(
  server: RecentSearch[],
  local: RecentSearch[]
): RecentSearch[] {
  const out: RecentSearch[] = [];
  const seen = new Set<string>();
  const push = (entry: RecentSearch) => {
    const key =
      entry.path && entry.path.length > 0
        ? `path:${entry.path}`
        : `q:${entry.q}:${entry.region}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(entry);
  };
  const sorted = [...server, ...local].sort((a, b) => b.ts - a.ts);
  for (const entry of sorted) {
    push(entry);
    if (out.length >= MAX_RECENT) break;
  }
  return out;
}

export async function pushUserRecentSearch(
  userId: string,
  entry: Omit<RecentSearch, "ts"> & { ts?: number }
): Promise<RecentSearch[]> {
  const current = await getUserRecentSearches(userId);
  const next: RecentSearch = {
    ...entry,
    q: entry.q.trim(),
    ts: entry.ts ?? Date.now(),
  };
  if (!next.q && !next.path) return current;
  const merged = mergeRecentSearches([next], current);
  return replaceUserRecentSearches(userId, merged);
}

export async function findUserIdByDiscordAccountId(
  discordId: string
): Promise<string | null> {
  const [row] = await db
    .select({ userId: schema.account.userId })
    .from(schema.account)
    .where(
      and(
        eq(schema.account.providerId, "discord"),
        eq(schema.account.accountId, discordId)
      )
    )
    .limit(1);
  return row?.userId ?? null;
}

export async function findUserIdByGoogleAccountId(
  googleSub: string
): Promise<string | null> {
  const [row] = await db
    .select({ userId: schema.account.userId })
    .from(schema.account)
    .where(
      and(
        eq(schema.account.providerId, "google"),
        eq(schema.account.accountId, googleSub)
      )
    )
    .limit(1);
  return row?.userId ?? null;
}

export async function getUserPreferredRegion(
  userId: string
): Promise<string | null> {
  const [row] = await db
    .select({ preferredRegion: schema.user.preferredRegion })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  return row?.preferredRegion ?? null;
}

export async function setUserPreferredRegion(
  userId: string,
  region: string | null
): Promise<string | null> {
  const [row] = await db
    .update(schema.user)
    .set({ preferredRegion: region, updatedAt: new Date() })
    .where(eq(schema.user.id, userId))
    .returning({ preferredRegion: schema.user.preferredRegion });
  return row?.preferredRegion ?? null;
}

export async function clearUserSyncedPrefs(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.userWatchlistEntries)
      .where(eq(schema.userWatchlistEntries.userId, userId));
    await tx
      .delete(schema.userRecentSearches)
      .where(eq(schema.userRecentSearches.userId, userId));
  });
}

export async function deleteUserAccount(userId: string): Promise<void> {
  // Cascades remove session/account/watchlist/recent via FKs.
  await db.delete(schema.user).where(eq(schema.user.id, userId));
}

export async function getUserSyncedCounts(userId: string): Promise<{
  watchlistCount: number;
  recentSearchCount: number;
}> {
  const [watchlistRows, searchRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(schema.userWatchlistEntries)
      .where(eq(schema.userWatchlistEntries.userId, userId)),
    db
      .select({ count: count() })
      .from(schema.userRecentSearches)
      .where(eq(schema.userRecentSearches.userId, userId)),
  ]);
  return {
    watchlistCount: Number(watchlistRows[0]?.count ?? 0),
    recentSearchCount: Number(searchRows[0]?.count ?? 0),
  };
}

export type UserSessionSummary = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  current: boolean;
};

export async function listUserSessions(
  userId: string,
  currentSessionId: string | null
): Promise<UserSessionSummary[]> {
  const rows = await db
    .select({
      id: schema.session.id,
      ipAddress: schema.session.ipAddress,
      userAgent: schema.session.userAgent,
      createdAt: schema.session.createdAt,
      updatedAt: schema.session.updatedAt,
      expiresAt: schema.session.expiresAt,
    })
    .from(schema.session)
    .where(
      and(
        eq(schema.session.userId, userId),
        gt(schema.session.expiresAt, new Date())
      )
    )
    .orderBy(desc(schema.session.updatedAt))
    .limit(50);

  return rows.map((row) => ({
    ...row,
    current: Boolean(currentSessionId && row.id === currentSessionId),
  }));
}

export async function revokeUserSession(
  userId: string,
  sessionId: string,
  currentSessionId: string
): Promise<"ok" | "current" | "missing"> {
  if (sessionId === currentSessionId) return "current";
  const deleted = await db
    .delete(schema.session)
    .where(
      and(eq(schema.session.id, sessionId), eq(schema.session.userId, userId))
    )
    .returning({ id: schema.session.id });
  return deleted.length > 0 ? "ok" : "missing";
}

export async function revokeOtherUserSessions(
  userId: string,
  currentSessionId: string
): Promise<number> {
  const deleted = await db
    .delete(schema.session)
    .where(
      and(
        eq(schema.session.userId, userId),
        ne(schema.session.id, currentSessionId)
      )
    )
    .returning({ id: schema.session.id });
  return deleted.length;
}

async function listSocialAccounts(userId: string) {
  const rows = await db
    .select({
      providerId: schema.account.providerId,
      accountId: schema.account.accountId,
    })
    .from(schema.account)
    .where(eq(schema.account.userId, userId));
  return rows.filter(
    (row) => row.providerId === "discord" || row.providerId === "google"
  );
}

export async function unlinkSocialProvider(
  userId: string,
  provider: "discord" | "google"
): Promise<"ok" | "last" | "missing"> {
  const social = await listSocialAccounts(userId);
  if (!social.some((row) => row.providerId === provider)) return "missing";
  if (social.length < 2) return "last";

  const deleted = await db
    .delete(schema.account)
    .where(
      and(
        eq(schema.account.userId, userId),
        eq(schema.account.providerId, provider)
      )
    )
    .returning({ id: schema.account.id });
  return deleted.length > 0 ? "ok" : "missing";
}

export async function getUserAccountExport(userId: string) {
  const [watchlist, recentSearches, preferredRegion, providers, claims] =
    await Promise.all([
      getUserWatchlist(userId),
      getUserRecentSearches(userId),
      getUserPreferredRegion(userId),
      listSocialAccounts(userId),
      listClaimedCharacters(userId),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    preferredRegion,
    providers: providers.map((row) => ({
      providerId: row.providerId,
      accountId: row.accountId,
    })),
    watchlist,
    recentSearches,
    claimedCharacters: claims,
  };
}

export type ClaimedCharacter = {
  id: string;
  region: AlbionRegion;
  albionId: string;
  name: string;
  claimedAt: string;
};

function isUniqueViolation(error: unknown): boolean {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : typeof error === "object" &&
          error &&
          "cause" in error &&
          typeof (error as { cause?: { code?: unknown } }).cause === "object"
        ? String((error as { cause?: { code?: unknown } }).cause?.code ?? "")
        : "";
  return code === "23505";
}

async function hydrateClaim(
  row: typeof schema.userClaimedCharacters.$inferSelect
): Promise<ClaimedCharacter | null> {
  if (!isRegionEnabled(row.region)) return null;
  const player = await getPlayerByAlbionId(row.region, row.albionId);
  return {
    id: row.id,
    region: row.region,
    albionId: row.albionId,
    name: player?.name ?? row.albionId,
    claimedAt: row.claimedAt.toISOString(),
  };
}

export async function listClaimedCharacters(
  userId: string
): Promise<ClaimedCharacter[]> {
  const rows = await db
    .select()
    .from(schema.userClaimedCharacters)
    .where(eq(schema.userClaimedCharacters.userId, userId))
    .orderBy(schema.userClaimedCharacters.region);

  const claims: ClaimedCharacter[] = [];
  for (const row of rows) {
    const claim = await hydrateClaim(row);
    if (claim) claims.push(claim);
  }
  return claims;
}

export async function resolveClaimablePlayer(
  region: AlbionRegion,
  input: { albionId?: string; name?: string }
) {
  const albionId = input.albionId?.trim();
  if (albionId) {
    const byId = await getPlayerByAlbionId(region, albionId);
    if (byId) return byId;
  }
  const name = input.name?.trim() || albionId;
  if (!name) return null;
  return getPlayerByNameCaseInsensitive(region, name);
}

export type ClaimCharacterResult =
  | { ok: true; claim: ClaimedCharacter }
  | { ok: false; error: "invalid_region" | "not_found" | "taken" };

export async function claimCharacter(
  userId: string,
  region: string,
  input: { albionId?: string; name?: string }
): Promise<ClaimCharacterResult> {
  if (!isRegionEnabled(region)) {
    return { ok: false, error: "invalid_region" };
  }

  const player = await resolveClaimablePlayer(region, input);
  if (!player) return { ok: false, error: "not_found" };

  try {
    const row = await db.transaction(async (tx) => {
      const [owned] = await tx
        .select()
        .from(schema.userClaimedCharacters)
        .where(
          and(
            eq(schema.userClaimedCharacters.region, region),
            eq(schema.userClaimedCharacters.albionId, player.albionId)
          )
        )
        .limit(1);
      if (owned && owned.userId !== userId) {
        return "taken" as const;
      }

      await tx
        .delete(schema.userClaimedCharacters)
        .where(
          and(
            eq(schema.userClaimedCharacters.userId, userId),
            eq(schema.userClaimedCharacters.region, region)
          )
        );

      const [inserted] = await tx
        .insert(schema.userClaimedCharacters)
        .values({
          userId,
          region,
          albionId: player.albionId,
          claimedAt: new Date(),
        })
        .returning();
      return inserted;
    });

    if (row === "taken" || !row) {
      return { ok: false, error: "taken" };
    }
    const claim = await hydrateClaim(row);
    if (!claim) return { ok: false, error: "not_found" };
    return { ok: true, claim };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "taken" };
    }
    throw error;
  }
}

export async function unclaimCharacter(
  userId: string,
  region: string
): Promise<boolean> {
  if (!isRegionEnabled(region)) return false;
  const deleted = await db
    .delete(schema.userClaimedCharacters)
    .where(
      and(
        eq(schema.userClaimedCharacters.userId, userId),
        eq(schema.userClaimedCharacters.region, region)
      )
    )
    .returning({ id: schema.userClaimedCharacters.id });
  return deleted.length > 0;
}

export async function adminUnclaimCharacter(
  userId: string,
  region: string
): Promise<boolean> {
  return unclaimCharacter(userId, region);
}

export async function adminReassignCharacter(
  userId: string,
  region: string,
  input: { albionId?: string; name?: string }
): Promise<ClaimCharacterResult> {
  if (!isRegionEnabled(region)) {
    return { ok: false, error: "invalid_region" };
  }
  const player = await resolveClaimablePlayer(region, input);
  if (!player) return { ok: false, error: "not_found" };

  const [userRow] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  if (!userRow) return { ok: false, error: "not_found" };

  const row = await db.transaction(async (tx) => {
    await tx
      .delete(schema.userClaimedCharacters)
      .where(
        and(
          eq(schema.userClaimedCharacters.region, region),
          eq(schema.userClaimedCharacters.albionId, player.albionId)
        )
      );
    await tx
      .delete(schema.userClaimedCharacters)
      .where(
        and(
          eq(schema.userClaimedCharacters.userId, userId),
          eq(schema.userClaimedCharacters.region, region)
        )
      );
    const [inserted] = await tx
      .insert(schema.userClaimedCharacters)
      .values({
        userId,
        region,
        albionId: player.albionId,
        claimedAt: new Date(),
      })
      .returning();
    return inserted;
  });

  const claim = row ? await hydrateClaim(row) : null;
  if (!claim) return { ok: false, error: "not_found" };
  return { ok: true, claim };
}

export async function listUsersForAdmin(options?: {
  q?: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  const q = options?.q?.trim();

  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      emailVerified: schema.user.emailVerified,
      image: schema.user.image,
      isAdmin: schema.user.isAdmin,
      preferredRegion: schema.user.preferredRegion,
      createdAt: schema.user.createdAt,
      updatedAt: schema.user.updatedAt,
    })
    .from(schema.user)
    .orderBy(desc(schema.user.createdAt))
    .limit(limit);

  const [accounts, watchlistCounts, recentSearchCounts, sessionStats, claims] =
    await Promise.all([
      db
        .select({
          userId: schema.account.userId,
          providerId: schema.account.providerId,
          accountId: schema.account.accountId,
          createdAt: schema.account.createdAt,
        })
        .from(schema.account),
      db
        .select({
          userId: schema.userWatchlistEntries.userId,
          count: count(),
        })
        .from(schema.userWatchlistEntries)
        .groupBy(schema.userWatchlistEntries.userId),
      db
        .select({
          userId: schema.userRecentSearches.userId,
          count: count(),
        })
        .from(schema.userRecentSearches)
        .groupBy(schema.userRecentSearches.userId),
      db
        .select({
          userId: schema.session.userId,
          lastActiveAt: max(schema.session.updatedAt),
          activeSessionCount: sql<number>`count(*) filter (where ${schema.session.expiresAt} > now())`.mapWith(
            Number
          ),
        })
        .from(schema.session)
        .groupBy(schema.session.userId),
      db
        .select({
          id: schema.userClaimedCharacters.id,
          userId: schema.userClaimedCharacters.userId,
          region: schema.userClaimedCharacters.region,
          albionId: schema.userClaimedCharacters.albionId,
          claimedAt: schema.userClaimedCharacters.claimedAt,
          name: schema.players.name,
        })
        .from(schema.userClaimedCharacters)
        .leftJoin(
          schema.players,
          and(
            eq(schema.players.region, schema.userClaimedCharacters.region),
            eq(schema.players.albionId, schema.userClaimedCharacters.albionId)
          )
        ),
    ]);

  const providersByUser = new Map<
    string,
    Array<{ providerId: string; accountId: string; createdAt: Date }>
  >();
  for (const account of accounts) {
    const list = providersByUser.get(account.userId) ?? [];
    list.push({
      providerId: account.providerId,
      accountId: account.accountId,
      createdAt: account.createdAt,
    });
    providersByUser.set(account.userId, list);
  }

  const watchlistByUser = new Map(
    watchlistCounts.map((row) => [row.userId, Number(row.count)])
  );
  const recentSearchesByUser = new Map(
    recentSearchCounts.map((row) => [row.userId, Number(row.count)])
  );
  const sessionByUser = new Map(
    sessionStats.map((row) => [
      row.userId,
      {
        lastActiveAt: row.lastActiveAt,
        activeSessionCount: Number(row.activeSessionCount ?? 0),
      },
    ])
  );
  const claimsByUser = new Map<
    string,
    Array<{
      id: string;
      region: string;
      albionId: string;
      name: string;
      claimedAt: Date;
    }>
  >();
  for (const claim of claims) {
    const list = claimsByUser.get(claim.userId) ?? [];
    list.push({
      id: claim.id,
      region: claim.region,
      albionId: claim.albionId,
      name: claim.name ?? claim.albionId,
      claimedAt: claim.claimedAt,
    });
    claimsByUser.set(claim.userId, list);
  }

  const filtered = q
    ? users.filter((u) => {
        const needle = q.toLowerCase();
        if (
          u.name.toLowerCase().includes(needle) ||
          (!isSyntheticDiscordEmail(u.email) &&
            u.email.toLowerCase().includes(needle)) ||
          u.id.includes(q) ||
          (u.preferredRegion ?? "").toLowerCase().includes(needle)
        ) {
          return true;
        }
        const providers = providersByUser.get(u.id) ?? [];
        if (
          providers.some(
            (p) =>
              p.accountId.includes(q) ||
              p.providerId.toLowerCase().includes(needle)
          )
        ) {
          return true;
        }
        const userClaims = claimsByUser.get(u.id) ?? [];
        return userClaims.some(
          (claim) =>
            claim.albionId.includes(q) ||
            claim.name.toLowerCase().includes(needle)
        );
      })
    : users;

  return filtered.map((user) => {
    const session = sessionByUser.get(user.id);
    return {
      ...user,
      providers: providersByUser.get(user.id) ?? [],
      claims: claimsByUser.get(user.id) ?? [],
      watchlistCount: watchlistByUser.get(user.id) ?? 0,
      recentSearchCount: recentSearchesByUser.get(user.id) ?? 0,
      lastActiveAt: session?.lastActiveAt ?? null,
      activeSessionCount: session?.activeSessionCount ?? 0,
    };
  });
}

export async function setUserAdmin(
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  const [row] = await db
    .update(schema.user)
    .set({ isAdmin, updatedAt: new Date() })
    .where(eq(schema.user.id, userId))
    .returning({ id: schema.user.id });
  return Boolean(row);
}
