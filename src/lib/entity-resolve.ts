import type { AlbionRegion } from "@/lib/albion/types";
import { getAlbionClient } from "@/lib/albion/client";
import {
  getGuildByAlbionId,
  getGuildByName,
  getGuildByNameCaseInsensitive,
  getPlayerByAlbionId,
  getPlayerByName,
  getPlayerByNameCaseInsensitive,
} from "@/lib/db/queries";
import { feudPath, guildPath, playerPath } from "@/lib/seo";

/** Albion entity IDs are long alphanumeric strings without spaces. */
const ALBION_ID_RE = /^[A-Za-z0-9_-]{16,}$/;

export function decodeEntitySegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function looksLikeAlbionId(segment: string): boolean {
  return ALBION_ID_RE.test(segment) && !segment.includes(" ");
}

function entityPathNeedsRedirect(
  buildPath: (name: string) => string,
  rawSegment: string,
  canonicalName: string
): string | undefined {
  const decoded = decodeEntitySegment(rawSegment);
  if (decoded !== canonicalName) {
    return buildPath(canonicalName);
  }
  const canonical = buildPath(canonicalName);
  const currentEncoded = buildPath(decoded);
  if (canonical !== currentEncoded) {
    return canonical;
  }
  return undefined;
}

export type PlayerResolveResult = {
  player: NonNullable<Awaited<ReturnType<typeof getPlayerByAlbionId>>>;
  albionId: string;
  redirectTo?: string;
};

export type GuildResolveResult = {
  guild: NonNullable<Awaited<ReturnType<typeof getGuildByAlbionId>>>;
  albionId: string;
  redirectTo?: string;
};

export async function resolvePlayerFromSegment(
  region: AlbionRegion,
  rawSegment: string
): Promise<PlayerResolveResult | null> {
  const decoded = decodeEntitySegment(rawSegment);

  const byExactName = await getPlayerByName(region, decoded);
  if (byExactName) {
    const redirectTo = entityPathNeedsRedirect(
      (name) => playerPath(region, name),
      rawSegment,
      byExactName.name
    );
    return {
      player: byExactName,
      albionId: byExactName.albionId,
      redirectTo,
    };
  }

  if (looksLikeAlbionId(decoded)) {
    const byId = await getPlayerByAlbionId(region, decoded);
    if (byId) {
      return {
        player: byId,
        albionId: byId.albionId,
        redirectTo: playerPath(region, byId.name),
      };
    }
  }

  const byCaseInsensitive = await getPlayerByNameCaseInsensitive(
    region,
    decoded
  );
  if (byCaseInsensitive) {
    return {
      player: byCaseInsensitive,
      albionId: byCaseInsensitive.albionId,
      redirectTo: playerPath(region, byCaseInsensitive.name),
    };
  }

  return null;
}

export async function resolveGuildFromSegment(
  region: AlbionRegion,
  rawSegment: string
): Promise<GuildResolveResult | null> {
  const decoded = decodeEntitySegment(rawSegment);

  const byExactName = await getGuildByName(region, decoded);
  if (byExactName) {
    const redirectTo = entityPathNeedsRedirect(
      (name) => guildPath(region, name),
      rawSegment,
      byExactName.name
    );
    return {
      guild: byExactName,
      albionId: byExactName.albionId,
      redirectTo,
    };
  }

  if (looksLikeAlbionId(decoded)) {
    const byId = await getGuildByAlbionId(region, decoded);
    if (byId) {
      return {
        guild: byId,
        albionId: byId.albionId,
        redirectTo: guildPath(region, byId.name),
      };
    }
  }

  const byCaseInsensitive = await getGuildByNameCaseInsensitive(region, decoded);
  if (byCaseInsensitive) {
    return {
      guild: byCaseInsensitive,
      albionId: byCaseInsensitive.albionId,
      redirectTo: guildPath(region, byCaseInsensitive.name),
    };
  }

  return null;
}

export type FeudResolveResult = {
  guildA: NonNullable<Awaited<ReturnType<typeof getGuildByAlbionId>>>;
  guildB: NonNullable<Awaited<ReturnType<typeof getGuildByAlbionId>>>;
  redirectTo?: string;
};

export async function resolveFeudFromSegments(
  region: AlbionRegion,
  rawSegmentA: string,
  rawSegmentB: string
): Promise<FeudResolveResult | null> {
  const [resolvedA, resolvedB] = await Promise.all([
    resolveGuildFromSegment(region, rawSegmentA),
    resolveGuildFromSegment(region, rawSegmentB),
  ]);

  if (!resolvedA || !resolvedB) return null;

  const canonical = feudPath(
    region,
    resolvedA.guild.name,
    resolvedB.guild.name
  );
  const current = feudPath(
    region,
    decodeEntitySegment(rawSegmentA),
    decodeEntitySegment(rawSegmentB)
  );
  const redirectTo = canonical !== current ? canonical : undefined;

  return {
    guildA: resolvedA.guild,
    guildB: resolvedB.guild,
    redirectTo,
  };
}

export async function searchAlbionPlayerIdByExactName(
  region: AlbionRegion,
  name: string
): Promise<string | null> {
  const client = getAlbionClient();
  const result = await client.search(region, name, { timeout: 8_000, maxRetries: 1 });
  const match = result.players.find((player) => player.Name === name);
  return match?.Id?.trim() || null;
}

export async function searchAlbionGuildIdByExactName(
  region: AlbionRegion,
  name: string
): Promise<string | null> {
  const client = getAlbionClient();
  const result = await client.search(region, name, { timeout: 8_000, maxRetries: 1 });
  const match = result.guilds.find((guild) => guild.Name === name);
  return match?.Id?.trim() || null;
}

export function resolveUncachedPlayerId(
  rawSegment: string,
  albionIdFromSearch: string | null
): string | null {
  const decoded = decodeEntitySegment(rawSegment);
  if (albionIdFromSearch) return albionIdFromSearch;
  if (looksLikeAlbionId(decoded)) return decoded;
  return null;
}

export function resolveUncachedGuildId(
  rawSegment: string,
  albionIdFromSearch: string | null
): string | null {
  const decoded = decodeEntitySegment(rawSegment);
  if (albionIdFromSearch) return albionIdFromSearch;
  if (looksLikeAlbionId(decoded)) return decoded;
  return null;
}

export async function resolvePlayerAlbionId(
  region: AlbionRegion,
  rawSegment: string
): Promise<{ albionId: string; redirectTo?: string } | null> {
  const segment = rawSegment?.trim();
  if (!segment) return null;

  try {
    const resolved = await resolvePlayerFromSegment(region, segment);
    if (resolved) {
      return {
        albionId: resolved.albionId,
        redirectTo: resolved.redirectTo,
      };
    }
  } catch {
    // DB unavailable — fall through to ID/search resolution.
  }

  const decoded = decodeEntitySegment(segment);

  // Legacy ID URLs must work even when Albion search is unavailable.
  if (looksLikeAlbionId(decoded)) {
    return { albionId: decoded };
  }

  try {
    const albionIdFromSearch = await searchAlbionPlayerIdByExactName(
      region,
      decoded
    );
    if (albionIdFromSearch) {
      return { albionId: albionIdFromSearch };
    }
  } catch {
    // Search unavailable — only ID-like segments can proceed without it.
  }

  return null;
}

export async function resolveGuildAlbionId(
  region: AlbionRegion,
  rawSegment: string
): Promise<{ albionId: string; redirectTo?: string } | null> {
  const segment = rawSegment?.trim();
  if (!segment) return null;

  try {
    const resolved = await resolveGuildFromSegment(region, segment);
    if (resolved) {
      return {
        albionId: resolved.albionId,
        redirectTo: resolved.redirectTo,
      };
    }
  } catch {
    // DB unavailable — fall through to ID/search resolution.
  }

  const decoded = decodeEntitySegment(segment);

  if (looksLikeAlbionId(decoded)) {
    return { albionId: decoded };
  }

  try {
    const albionIdFromSearch = await searchAlbionGuildIdByExactName(
      region,
      decoded
    );
    if (albionIdFromSearch) {
      return { albionId: albionIdFromSearch };
    }
  } catch {
    // Search unavailable — only ID-like segments can proceed without it.
  }

  return null;
}
