import {
  getAllianceFameFromMemberGuilds,
} from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import { AllianceHeader } from "@/components/AllianceHeader";
import { entityPath } from "@/lib/seo";

export async function AllianceHeaderSection({
  region,
  allianceId,
  alliance,
  info,
  guilds,
  memberCount,
}: {
  region: AlbionRegion;
  allianceId: string;
  alliance: { killFame: number | null; deathFame: number | null };
  info: {
    name: string;
    tag: string | null;
    founderId: string | null;
    founderName: string | null;
    founded: string | null;
  };
  guilds: { id: string; name: string }[];
  memberCount: number | null;
}) {
  const memberFame = await getAllianceFameFromMemberGuilds(region, allianceId);
  const killFame = alliance.killFame || memberFame.killFame;
  const deathFame = alliance.deathFame || memberFame.deathFame;

  return (
    <AllianceHeader
      alliance={{
        name: info.name,
        albionId: allianceId,
        tag: info.tag,
        region,
        memberCount,
        guildCount: guilds.length,
        killFame,
        deathFame,
        founderId: info.founderId,
        founderName: info.founderName,
        founded: info.founded,
      }}
      guilds={guilds.map((guild) => ({ id: guild.id, name: guild.name }))}
      sharePath={entityPath("alliance", region, allianceId)}
    />
  );
}
