import type { AlbionRegion } from "@/lib/albion/types";
import {
  ensureEntityResolveQueued,
  getEntityResolveJobInfo,
} from "@/lib/ingest-api";
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

export type EntityResolveType = "player" | "guild";

export type EntityAlbionIdResolve =
  | { albionId: string; redirectTo?: string }
  | { pending: true; entityName: string; entityType: EntityResolveType };

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

async function queueEntityResolveByName(
  region: AlbionRegion,
  entityType: EntityResolveType,
  name: string
): Promise<EntityAlbionIdResolve> {
  await ensureEntityResolveQueued(region, entityType, name, {
    immediate: true,
  });
  return { pending: true, entityName: name, entityType };
}

export async function resolvePlayerAlbionId(
  region: AlbionRegion,
  rawSegment: string
): Promise<EntityAlbionIdResolve | null> {
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
    // DB unavailable — fall through to ID resolution.
  }

  const decoded = decodeEntitySegment(segment);

  if (looksLikeAlbionId(decoded)) {
    return { albionId: decoded };
  }

  try {
    const jobInfo = await getEntityResolveJobInfo(region, "player", decoded);
    if (jobInfo.albionId) {
      return { albionId: jobInfo.albionId };
    }
    if (jobInfo.state === "failed") {
      return null;
    }
    if (jobInfo.state) {
      return {
        pending: true,
        entityName: decoded,
        entityType: "player",
      };
    }
  } catch {
    // Ingest unavailable — queue below.
  }

  return queueEntityResolveByName(region, "player", decoded);
}

export async function resolveGuildAlbionId(
  region: AlbionRegion,
  rawSegment: string
): Promise<EntityAlbionIdResolve | null> {
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
    // DB unavailable — fall through to ID resolution.
  }

  const decoded = decodeEntitySegment(segment);

  if (looksLikeAlbionId(decoded)) {
    return { albionId: decoded };
  }

  try {
    const jobInfo = await getEntityResolveJobInfo(region, "guild", decoded);
    if (jobInfo.albionId) {
      return { albionId: jobInfo.albionId };
    }
    if (jobInfo.state === "failed") {
      return null;
    }
    if (jobInfo.state) {
      return {
        pending: true,
        entityName: decoded,
        entityType: "guild",
      };
    }
  } catch {
    // Ingest unavailable — queue below.
  }

  return queueEntityResolveByName(region, "guild", decoded);
}

export async function getEntityResolveJobStateForPending(
  region: AlbionRegion,
  entityType: EntityResolveType,
  entityName: string
): Promise<string | null> {
  const info = await getEntityResolveJobInfo(region, entityType, entityName);
  return info.state;
}
