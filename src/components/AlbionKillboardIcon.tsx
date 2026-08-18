import { cn } from "@/lib/utils";

/** Frames in the killboard sprite (1540×100, 14 icons). */
export const KILLBOARD_ICON = {
  fame: 0,
  swords: 1,
  shield: 2,
  gathering: 3,
  goldDown: 4,
  versus: 5,
  versusSilver: 6,
  gear: 7,
  bow: 8,
  skull: 9,
  silver: 10,
  silverDown: 11,
  auction: 12,
  building: 13,
} as const;

export type KillboardIconName = keyof typeof KILLBOARD_ICON;

const FRAME_COUNT = 14;
const SPRITE_SRC = "https://cdn.aotracker.net/albion/killboard-icons.png";

/**
 * Official Albion killboard sprite icon.
 * `className` should set the displayed size (e.g. `size-4`).
 */
export function AlbionKillboardIcon({
  icon,
  className,
}: {
  icon: KillboardIconName;
  className?: string;
}) {
  const index = KILLBOARD_ICON[icon];
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-no-repeat", className ?? "size-4")}
      style={{
        backgroundImage: `url(${SPRITE_SRC})`,
        backgroundSize: `${FRAME_COUNT * 100}% 100%`,
        backgroundPosition: `${(index / (FRAME_COUNT - 1)) * 100}% 0`,
      }}
    />
  );
}
