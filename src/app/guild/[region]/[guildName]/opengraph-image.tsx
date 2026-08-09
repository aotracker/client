import type { AlbionGuildInfo, AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import { getGuildByAlbionId } from "@/lib/db/queries";
import { resolveGuildFromSegment } from "@/lib/entity-resolve";
import { createOgImage, createProfileOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import {
  formatAllianceLabel,
  formatFame,
  regionLabel,
} from "@/lib/utils";

export const alt = "Guild profile";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

interface Props {
  params: Promise<{ region: string; guildName: string }>;
}

export default async function Image({ params }: Props) {
  const { region, guildName } = await params;

  if (!isRegionEnabled(region)) {
    return createOgImage({
      title: "Guild not found",
      subtitle: "This guild profile is unavailable.",
      badge: regionLabel(region),
    });
  }

  const albionRegion = region as AlbionRegion;
  const resolved = await resolveGuildFromSegment(albionRegion, guildName);
  const guild = resolved
    ? await getGuildByAlbionId(albionRegion, resolved.albionId)
    : null;

  if (!guild) {
    return createOgImage({
      title: "Loading guild…",
      subtitle: "Profile is still being fetched from Albion Online.",
      badge: regionLabel(region),
    });
  }

  const payload = guild.rawPayload as AlbionGuildInfo | null;
  const allianceName = guild.allianceName?.trim() || null;
  const allianceTag =
    guild.allianceTag?.trim() || payload?.AllianceTag?.trim() || null;
  const founderName =
    payload?.FounderName?.trim() || null;

  return createProfileOgImage({
    title: guild.name,
    badge: "Guild",
    region: regionLabel(region),
    affiliation: allianceName
      ? formatAllianceLabel(allianceName, allianceTag)
      : null,
    stats: [
      {
        label: "Kill Fame",
        value: formatFame(guild.killFame),
        color: "#3dd68c",
      },
      {
        label: "Death Fame",
        value: formatFame(guild.deathFame),
        color: "#e85d5d",
      },
      {
        label: "Members",
        value: guild.memberCount?.toLocaleString() ?? "—",
      },
    ],
    meta: founderName ? `Founder: ${founderName}` : null,
  });
}
