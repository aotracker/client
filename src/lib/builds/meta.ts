import { itemFamilyKey } from "@/lib/item-icons";
import type {
  MetaBuildArmorFilter,
  MetaBuildRoleFilter,
  MetaBuildSort,
} from "@/lib/builds/params";
import { getMainHandItem, type PlayerBuildItem } from "@/lib/builds/fingerprint";

/** Hide K/D until a build has enough appearances to be more than noise. */
export const META_KD_MIN_APPEARANCES = 20;

export type MetaBuildMixRole = "healer" | "tank" | "support" | "dps";
export type MetaBuildMixArmor = "plate" | "leather" | "cloth";

export interface MetaBuildSortable {
  kills: number;
  deaths: number;
  appearances: number;
  uniquePlayers: number;
  totalFame: number;
  kd: number | null;
  weaponRole: MetaBuildMixRole | null;
  armorClass: MetaBuildMixArmor | null;
  items: PlayerBuildItem[];
}

export function metaBuildKd(kills: number, deaths: number): number {
  if (deaths > 0) return kills / deaths;
  return kills > 0 ? kills : 0;
}

export function isMetaKdReliable(appearances: number): boolean {
  return appearances >= META_KD_MIN_APPEARANCES;
}

export function metaBuildKdOrNull(
  kills: number,
  deaths: number,
  appearances: number
): number | null {
  if (!isMetaKdReliable(appearances)) return null;
  return metaBuildKd(kills, deaths);
}

export function matchesMetaBuildFilters(
  entry: MetaBuildSortable,
  filters: {
    role?: MetaBuildRoleFilter;
    armor?: MetaBuildArmorFilter;
    weapon?: string | null;
  }
): boolean {
  const role = filters.role ?? "all";
  const armor = filters.armor ?? "all";
  const weapon = filters.weapon ?? null;

  if (role !== "all" && entry.weaponRole !== role) return false;
  if (armor !== "all" && entry.armorClass !== armor) return false;
  if (weapon) {
    const mainHand = getMainHandItem(entry.items);
    if (!mainHand || itemFamilyKey(mainHand.itemType) !== weapon) return false;
  }
  return true;
}

function kdSortValue(entry: MetaBuildSortable): number {
  return entry.kd ?? -1;
}

export function compareMetaBuilds(
  a: MetaBuildSortable,
  b: MetaBuildSortable,
  sort: MetaBuildSort
): number {
  if (sort === "kd") {
    return (
      kdSortValue(b) - kdSortValue(a) ||
      b.appearances - a.appearances ||
      b.uniquePlayers - a.uniquePlayers ||
      b.kills - a.kills
    );
  }
  if (sort === "kills") {
    return (
      b.kills - a.kills ||
      b.appearances - a.appearances ||
      b.uniquePlayers - a.uniquePlayers ||
      b.totalFame - a.totalFame
    );
  }
  if (sort === "fame") {
    return (
      b.totalFame - a.totalFame ||
      b.kills - a.kills ||
      b.appearances - a.appearances ||
      b.uniquePlayers - a.uniquePlayers
    );
  }
  return (
    b.appearances - a.appearances ||
    b.uniquePlayers - a.uniquePlayers ||
    b.kills - a.kills ||
    b.totalFame - a.totalFame
  );
}

export function filterSortSliceMetaBuilds<T extends MetaBuildSortable>(
  builds: T[],
  options: {
    sort?: MetaBuildSort;
    role?: MetaBuildRoleFilter;
    armor?: MetaBuildArmorFilter;
    weapon?: string | null;
    limit: number;
  }
): T[] {
  const sort = options.sort ?? "usage";
  return builds
    .filter((entry) => matchesMetaBuildFilters(entry, options))
    .sort((a, b) => compareMetaBuilds(a, b, sort))
    .slice(0, options.limit);
}

export function usageShare(appearances: number, sampleTotal: number): number {
  if (sampleTotal <= 0) return 0;
  return appearances / sampleTotal;
}

const MIX_ROLES: MetaBuildMixRole[] = ["dps", "healer", "tank", "support"];
const MIX_ARMOR: MetaBuildMixArmor[] = ["plate", "leather", "cloth"];

function metaBuildIdentity(entry: MetaBuildSortable): string {
  return entry.items
    .map((item) => `${item.slot}:${item.itemType}`)
    .join("|");
}

/**
 * Keep a compact subset that still covers role / armor / hottest-weapon
 * filters so Next.js `unstable_cache` stays under the 2MB limit.
 */
export function selectMetaBuildsForCache<T extends MetaBuildSortable>(
  builds: T[],
  options: {
    keepUsage: number;
    keepPerFacet: number;
    weaponFamilies?: string[];
  }
): T[] {
  const byUsage = [...builds].sort((a, b) => compareMetaBuilds(a, b, "usage"));
  const kept = new Map<string, T>();

  const add = (list: T[]) => {
    for (const entry of list) {
      const key = metaBuildIdentity(entry);
      if (key && !kept.has(key)) kept.set(key, entry);
    }
  };

  add(byUsage.slice(0, options.keepUsage));
  for (const role of MIX_ROLES) {
    add(
      byUsage
        .filter((entry) => entry.weaponRole === role)
        .slice(0, options.keepPerFacet)
    );
  }
  for (const armor of MIX_ARMOR) {
    add(
      byUsage
        .filter((entry) => entry.armorClass === armor)
        .slice(0, options.keepPerFacet)
    );
  }
  for (const family of options.weaponFamilies ?? []) {
    add(
      byUsage
        .filter((entry) => {
          const mainHand = getMainHandItem(entry.items);
          return mainHand != null && itemFamilyKey(mainHand.itemType) === family;
        })
        .slice(0, options.keepPerFacet)
    );
  }

  return [...kept.values()];
}
