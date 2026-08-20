import { and, eq, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { schema } from "@/lib/db";

export interface GuildFeudInput {
  guildNameA: string;
  guildNameB: string;
  guildAId?: string | null;
  guildBId?: string | null;
}

export interface NormalizedGuildFeudInput {
  nameA: string;
  nameB: string;
  idA: string | null;
  idB: string | null;
}

export function normalizeGuildFeudInput(input: GuildFeudInput): NormalizedGuildFeudInput | null {
  const nameA = input.guildNameA.trim().toLowerCase();
  const nameB = input.guildNameB.trim().toLowerCase();
  if (!nameA || !nameB || nameA === nameB) return null;

  const idA = input.guildAId?.trim() || null;
  const idB = input.guildBId?.trim() || null;
  return { nameA, nameB, idA, idB };
}

function guildNameEquals(column: AnyColumn, name: string) {
  return sql`lower(trim(${column})) = ${name}`;
}

function guildIdPairCondition(idA: string, idB: string): SQL {
  return or(
    and(
      eq(schema.killEvents.killerGuildAlbionId, idA),
      eq(schema.killEvents.victimGuildAlbionId, idB)
    ),
    and(
      eq(schema.killEvents.killerGuildAlbionId, idB),
      eq(schema.killEvents.victimGuildAlbionId, idA)
    )
  )!;
}

function guildNamePairCondition(nameA: string, nameB: string): SQL {
  return or(
    and(
      guildNameEquals(schema.killEvents.killerGuildName, nameA),
      guildNameEquals(schema.killEvents.victimGuildName, nameB)
    ),
    and(
      guildNameEquals(schema.killEvents.killerGuildName, nameB),
      guildNameEquals(schema.killEvents.victimGuildName, nameA)
    )
  )!;
}

/** Either-direction kills between two guilds (list queries). */
export function guildFeudPairCondition(input: GuildFeudInput): SQL | null {
  const normalized = normalizeGuildFeudInput(input);
  if (!normalized) return null;

  const { nameA, nameB, idA, idB } = normalized;
  if (idA && idB) return guildIdPairCondition(idA, idB);
  return guildNamePairCondition(nameA, nameB);
}

/** Killer guild A, victim guild B (stats: A kills B). */
export function guildFeudAKillsBCondition(input: GuildFeudInput): SQL | null {
  const normalized = normalizeGuildFeudInput(input);
  if (!normalized) return null;

  const { nameA, nameB, idA, idB } = normalized;
  if (idA && idB) {
    return and(
      eq(schema.killEvents.killerGuildAlbionId, idA),
      eq(schema.killEvents.victimGuildAlbionId, idB)
    )!;
  }
  return and(
    guildNameEquals(schema.killEvents.killerGuildName, nameA),
    guildNameEquals(schema.killEvents.victimGuildName, nameB)
  )!;
}

/** Killer guild B, victim guild A (stats: B kills A). */
export function guildFeudBKillsACondition(input: GuildFeudInput): SQL | null {
  const normalized = normalizeGuildFeudInput(input);
  if (!normalized) return null;

  const { nameA, nameB, idA, idB } = normalized;
  if (idA && idB) {
    return and(
      eq(schema.killEvents.killerGuildAlbionId, idB),
      eq(schema.killEvents.victimGuildAlbionId, idA)
    )!;
  }
  return and(
    guildNameEquals(schema.killEvents.killerGuildName, nameB),
    guildNameEquals(schema.killEvents.victimGuildName, nameA)
  )!;
}

export function allianceFeudPairCondition(idA: string, idB: string): SQL | null {
  const a = idA.trim();
  const b = idB.trim();
  if (!a || !b || a === b) return null;

  return or(
    and(
      eq(schema.killEvents.killerAllianceAlbionId, a),
      eq(schema.killEvents.victimAllianceAlbionId, b)
    ),
    and(
      eq(schema.killEvents.killerAllianceAlbionId, b),
      eq(schema.killEvents.victimAllianceAlbionId, a)
    )
  )!;
}

export function allianceFeudAKillsBCondition(idA: string, idB: string): SQL | null {
  const a = idA.trim();
  const b = idB.trim();
  if (!a || !b || a === b) return null;

  return and(
    eq(schema.killEvents.killerAllianceAlbionId, a),
    eq(schema.killEvents.victimAllianceAlbionId, b)
  )!;
}

export function allianceFeudBKillsACondition(idA: string, idB: string): SQL | null {
  const a = idA.trim();
  const b = idB.trim();
  if (!a || !b || a === b) return null;

  return and(
    eq(schema.killEvents.killerAllianceAlbionId, b),
    eq(schema.killEvents.victimAllianceAlbionId, a)
  )!;
}
