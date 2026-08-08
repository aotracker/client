import type { AlbionRegion } from "@/lib/albion/types";
import type { BattlesFeedItem } from "@/lib/db/queries";
import { RELATED_BATTLE_WINDOW_MS } from "@/lib/battles-constants";

const GUILD_OVERLAP_WEIGHT = 100;
const ALLIANCE_OVERLAP_WEIGHT = 40;
const TIME_PROXIMITY_WEIGHT = 30;

export type ScoredBattle = BattlesFeedItem & {
  score: number;
  overlapGuildName?: string;
};

function idsOf(items: { id: string }[]): Set<string> {
  return new Set(items.map((i) => i.id).filter(Boolean));
}

function countOverlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const id of a) {
    if (b.has(id)) n++;
  }
  return n;
}

function firstOverlapName(
  selected: { id: string; name: string }[],
  candidate: { id: string; name: string }[]
): string | undefined {
  const selectedIds = new Set(selected.map((s) => s.id));
  return candidate.find((c) => selectedIds.has(c.id))?.name;
}

function parseTime(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/** True when candidate start is within ±windowMs of at least one selected start. */
function isWithinWindowOfAny(
  candidateTime: number,
  selectedTimes: number[],
  windowMs: number
): boolean {
  return selectedTimes.some(
    (t) => Math.abs(candidateTime - t) <= windowMs
  );
}

function nearestSelectedDistance(
  candidateTime: number,
  selectedTimes: number[]
): number {
  return Math.min(...selectedTimes.map((t) => Math.abs(candidateTime - t)));
}

export function scoreRelatedBattles(
  selected: BattlesFeedItem[],
  candidates: BattlesFeedItem[],
  options?: { limit?: number; windowMs?: number }
): ScoredBattle[] {
  if (selected.length === 0) return [];
  const limit = options?.limit ?? 3;
  const windowMs = options?.windowMs ?? RELATED_BATTLE_WINDOW_MS;
  const region = selected[0].region as AlbionRegion;
  const selectedKeys = new Set(selected.map((b) => `${b.region}:${b.id}`));

  const selectedGuildIds = new Set<string>();
  const selectedAllianceIds = new Set<string>();
  const selectedGuilds: { id: string; name: string }[] = [];
  const selectedTimes: number[] = [];

  for (const battle of selected) {
    for (const g of battle.guilds) {
      selectedGuildIds.add(g.id);
      selectedGuilds.push(g);
    }
    for (const a of battle.alliances) selectedAllianceIds.add(a.id);
    const t = parseTime(battle.startTime);
    if (t != null) selectedTimes.push(t);
  }

  // Without timestamps we cannot enforce the hard 60m rule — skip suggestions.
  if (selectedTimes.length === 0) return [];

  const scored: ScoredBattle[] = [];

  for (const candidate of candidates) {
    if (candidate.region !== region) continue;
    if (selectedKeys.has(`${candidate.region}:${candidate.id}`)) continue;

    const candidateTime = parseTime(candidate.startTime);
    if (candidateTime == null) continue;

    // Hard cutoff: must be within ±60m of at least one selected battle start.
    if (!isWithinWindowOfAny(candidateTime, selectedTimes, windowMs)) {
      continue;
    }

    const guildOverlap = countOverlap(selectedGuildIds, idsOf(candidate.guilds));
    const allianceOverlap = countOverlap(
      selectedAllianceIds,
      idsOf(candidate.alliances)
    );

    const dist = nearestSelectedDistance(candidateTime, selectedTimes);
    const timeScore =
      TIME_PROXIMITY_WEIGHT * (1 - Math.min(1, dist / windowMs));

    const score =
      guildOverlap * GUILD_OVERLAP_WEIGHT +
      allianceOverlap * ALLIANCE_OVERLAP_WEIGHT +
      timeScore +
      Math.min(10, (candidate.totalFame ?? 0) / 1_000_000) +
      Math.min(5, (candidate.totalPlayers ?? 0) / 50);

    if (score <= 0) continue;

    scored.push({
      ...candidate,
      score,
      overlapGuildName: firstOverlapName(selectedGuilds, candidate.guilds),
    });
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.totalFame ?? 0) - (a.totalFame ?? 0) ||
        (b.totalPlayers ?? 0) - (a.totalPlayers ?? 0)
    )
    .slice(0, limit);
}
