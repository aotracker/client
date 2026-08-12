import { isRegionEnabled, type AlbionRegion } from "@/lib/albion/types";
import {
  getAllianceFameFromMemberGuilds,
  getAllianceProfileFromDb,
} from "@/lib/db/queries";
import { createOgImage, createProfileOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";
import { formatFame, regionLabel } from "@/lib/utils";

export const alt = "Alliance profile";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

interface Props {
  params: Promise<{ region: string; allianceId: string }>;
}

export default async function Image({ params }: Props) {
  const { region, allianceId } = await params;

  if (!isRegionEnabled(region)) {
    return createOgImage({
      title: "Alliance not found",
      subtitle: "This alliance profile is unavailable.",
      badge: regionLabel(region),
    });
  }

  const data = await getAllianceProfileFromDb(region as AlbionRegion, allianceId);
  if (!data) {
    return createOgImage({
      title: "Loading alliance…",
      subtitle: "Profile is still being fetched from Albion Online.",
      badge: regionLabel(region),
    });
  }

  const fame = await getAllianceFameFromMemberGuilds(
    region as AlbionRegion,
    allianceId
  );

  const guildNames = data.guilds.map((guild) => guild.name).filter(Boolean);
  const tag = data.info.tag?.trim() || null;
  const hasGuildList = guildNames.length > 0;

  return createProfileOgImage({
    title: data.info.name,
    badge: "Alliance",
    region: regionLabel(region),
    affiliation: tag ? `[${tag}]` : null,
    stats: [
      {
        label: "Kill Fame",
        value: formatFame(fame.killFame),
        color: "#3dd68c",
      },
      {
        label: "Death Fame",
        value: formatFame(fame.deathFame),
        color: "#e85d5d",
      },
      {
        label: "Members",
        value: data.memberCount?.toLocaleString() ?? "—",
      },
      ...(hasGuildList
        ? []
        : [
            {
              label: "Guilds",
              value: data.guilds.length.toLocaleString(),
            },
          ]),
    ],
    listTitle: `Member guilds (${data.guilds.length})`,
    listItems: guildNames,
    meta: data.info.founderName
      ? `Founder: ${data.info.founderName}`
      : null,
  });
}
