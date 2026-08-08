import { itemFamilyKey } from "@/lib/item-icons";

/**
 * Coarse combat role inferred from Albion main-hand weapon tree.
 * Hybrids (e.g. Nature DPS) follow the tree's primary identity.
 */
export type WeaponRole = "healer" | "tank" | "support" | "dps";

export const WEAPON_ROLES: WeaponRole[] = [
  "healer",
  "tank",
  "support",
  "dps",
];

export const WEAPON_ROLE_LABELS: Record<WeaponRole, string> = {
  healer: "Healer",
  tank: "Tank",
  support: "Support",
  dps: "DPS",
};

interface WeaponRoleRule {
  role: WeaponRole;
  /** Matched against tier-stripped family key, e.g. MAIN_HOLYSTAFF. */
  pattern: RegExp;
}

/**
 * Ordered rules — first match wins. Keep healer/tank/support ahead of DPS fallback.
 * Patterns use UniqueName fragments (ao-bin-dumps style).
 */
const WEAPON_ROLE_RULES: WeaponRoleRule[] = [
  {
    role: "healer",
    // Holy + Nature trees (Divine / Wild artifacts included)
    pattern: /HOLYSTAFF|DIVINESTAFF|NATURESTAFF|WILDSTAFF/,
  },
  {
    role: "tank",
    // Mace + Hammer trees (flail, polehammer, duals, keeper ram, etc.)
    // Black Monk Staff (quarterstaff tank line)
    pattern:
      /MACE|HAMMER|FLAIL|POLEHAMMER|RAM_KEEPER|SHAPESHIFTER_KEEPER|ICEGAUNTLETS_HELL|COMBATSTAFF_MORGANA/,
  },
  {
    role: "dps",
    // Arcane-line exceptions that play as DPS (checked before support)
    pattern: /ARCANESTAFF_CRYSTAL|ARCANESTAFF_UNDEAD/, // Astral / Witchwork
  },
  {
    role: "support",
    // Arcane purge/utility + Quarterstaff peel/CC + selected Cursed support lines
    // (Lifecurse / Rotcaller / Damnation — other Cursed stay DPS)
    pattern:
      /ARCANESTAFF|ENIGMATICSTAFF|ENIGMATICORB|ARCANE_RINGPAIR|QUARTERSTAFF|DOUBLEBLADEDSTAFF|IRONCLADEDSTAFF|CURSEDSTAFF_UNDEAD|CURSEDSTAFF_CRYSTAL|CURSEDSTAFF_MORGANA/,
  },
];

function isCombatMainHandFamily(family: string): boolean {
  if (family.includes("TOOL_")) return false;
  return family.startsWith("MAIN_") || family.startsWith("2H_");
}

/** Tier-stripped family key for role rules, or null if not a combat main-hand. */
export function getCombatWeaponFamily(
  itemType: string | null | undefined
): string | null {
  if (!itemType) return null;
  const family = itemFamilyKey(itemType);
  if (!family || !isCombatMainHandFamily(family)) return null;
  return family;
}

/**
 * Infer role from a main-hand item type (any tier/enchant/quality).
 * Returns null for non-weapons / tools / unknown slots.
 */
export function getWeaponRole(
  itemType: string | null | undefined
): WeaponRole | null {
  const family = getCombatWeaponFamily(itemType);
  if (!family) return null;

  for (const rule of WEAPON_ROLE_RULES) {
    if (rule.pattern.test(family)) return rule.role;
  }

  return "dps";
}

export function getWeaponRoleLabel(
  itemType: string | null | undefined
): string | null {
  const role = getWeaponRole(itemType);
  return role ? WEAPON_ROLE_LABELS[role] : null;
}

export function weaponRoleLabel(role: WeaponRole): string {
  return WEAPON_ROLE_LABELS[role];
}

export function isWeaponRole(
  itemType: string | null | undefined,
  role: WeaponRole
): boolean {
  return getWeaponRole(itemType) === role;
}
