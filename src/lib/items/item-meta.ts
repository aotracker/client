import itemMetaFile from "../../../data/item-meta.json";
import { itemFamilyKey } from "@/lib/item-icons";

export type ArmorClass = "plate" | "leather" | "cloth";
export type CatalogWeaponRole = "healer" | "tank" | "support" | "dps";

export type ItemMetaEntry = {
  slot: string;
  shop: string;
  sub: string;
  twoHanded: boolean;
  role?: CatalogWeaponRole;
  armorClass?: ArmorClass;
};

type ItemMetaCatalog = {
  items: Record<string, ItemMetaEntry>;
  count: number;
  updatedAt?: string;
};

const CATALOG = itemMetaFile as ItemMetaCatalog;

export function getItemMeta(
  itemType: string | null | undefined
): ItemMetaEntry | null {
  if (!itemType) return null;
  return CATALOG.items[itemFamilyKey(itemType)] ?? null;
}

export function getArmorClass(
  itemType: string | null | undefined
): ArmorClass | null {
  return getItemMeta(itemType)?.armorClass ?? null;
}

/** Armor class from a loadout: chest first, then head, then shoes. */
export function getBuildArmorClass(
  items: { slot?: string | null; itemType: string }[]
): ArmorClass | null {
  const bySlot = new Map(
    items.map((item) => [item.slot, item.itemType] as const)
  );
  for (const slot of ["Armor", "Head", "Shoes"] as const) {
    const itemType = bySlot.get(slot);
    const armorClass = getArmorClass(itemType);
    if (armorClass) return armorClass;
  }
  return null;
}
