import { itemFamilyKey } from "@/lib/item-icons";
import { getItemMeta } from "@/lib/items/item-meta";

/**
 * Coarse combat role from dump shop subcategory (itemroles.json party ratings).
 * Hybrids follow the tree's highest-rated party role.
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

  const meta = getItemMeta(itemType);
  if (meta?.shop && meta.shop !== "weapons") return null;
  if (meta?.role) return meta.role;

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
