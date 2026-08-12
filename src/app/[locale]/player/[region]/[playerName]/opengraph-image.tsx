import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";
import { getPlayerProfile } from "@/lib/db/queries";
import { resolvePlayerFromSegment } from "@/lib/entity-resolve";
import { createOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { formatFame, regionLabel } from "@/lib/utils";

export const alt = "Player profile";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

interface Props {
  params: Promise<{ region: string; playerName: string }>;
}

export default async function Image({ params }: Props) {
  const { region, playerName } = await params;

  if (!isRegionEnabled(region)) {
    return createOgImage({
      title: "Player not found",
      subtitle: "This player profile is unavailable.",
      badge: regionLabel(region),
    });
  }

  const albionRegion = region as AlbionRegion;
  const resolved = await resolvePlayerFromSegment(albionRegion, playerName);
  const albionId = resolved?.albionId;
  const profile = albionId
    ? await getPlayerProfile(albionRegion, albionId)
    : null;

  if (!profile) {
    return createOgImage({
      title: "Loading player…",
      subtitle: "Profile is still being fetched from Albion Online.",
      badge: regionLabel(region),
    });
  }

  const { player } = profile;
  return createOgImage({
    title: player.name,
    subtitle: player.guild?.name
      ? `${player.guild.name} · ${regionLabel(region)}`
      : regionLabel(region),
    badge: "Player",
    stats: [
      { label: "Kill fame", value: formatFame(player.killFame) },
      { label: "Death fame", value: formatFame(player.deathFame) },
    ],
  });
}
