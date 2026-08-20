import "server-only";

import type { AlbionBattlePlayer } from "@/lib/albion/types";
import { formatItemTooltip } from "@/lib/items/catalog";

export type BattlePlayerRow = AlbionBattlePlayer & {
  weaponTooltip?: string | null;
};

export function withBattlePlayerWeaponTooltips(
  players: AlbionBattlePlayer[],
  locale?: string | null
): BattlePlayerRow[] {
  return players.map((player) => ({
    ...player,
    weaponTooltip: player.weaponType
      ? formatItemTooltip(player.weaponType, locale)
      : null,
  }));
}
