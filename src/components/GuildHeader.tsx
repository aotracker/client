import { formatAllianceTag, formatFame, regionLabel } from "@/lib/utils";
import { OrgHeader } from "@/components/OrgHeader";

interface GuildHeaderProps {
  guild: {
    name: string;
    albionId?: string;
    region: string;
    killFame: number | null;
    deathFame: number | null;
    memberCount: number | null;
    founderId?: string | null;
    founderName?: string | null;
    founded?: string | null;
    allianceId?: string | null;
    allianceName?: string | null;
    allianceTag?: string | null;
    lastSyncedAt?: Date | null;
  };
  sharePath?: string;
}

export function GuildHeader({ guild, sharePath }: GuildHeaderProps) {
  const hasAlliance = Boolean(guild.allianceId?.trim());
  const allianceName = guild.allianceName?.trim() || "";
  const allianceTag = guild.allianceTag?.trim() || "";
  const allianceLabel =
    allianceName || allianceTag
      ? formatAllianceTag(allianceName || allianceTag, allianceTag || null)
      : null;

  return (
    <OrgHeader
      title={guild.name}
      kind="Guild"
      region={guild.region}
      albionId={guild.albionId}
      watchlistType="guild"
      sharePath={sharePath}
      founderName={guild.founderName}
      founded={guild.founded}
      entityIdLabel="Albion guild ID"
      lastSyncedAt={guild.lastSyncedAt}
      affiliations={[
        { key: "region", label: regionLabel(guild.region) },
        ...(allianceLabel
          ? [
              {
                key: "alliance",
                label: allianceLabel,
                href: hasAlliance
                  ? `/alliance/${guild.region}/${guild.allianceId}`
                  : undefined,
                title: guild.allianceName ?? undefined,
              },
            ]
          : []),
      ]}
      stats={[
        {
          label: "Kill Fame",
          value: formatFame(guild.killFame),
          variant: "kill",
        },
        {
          label: "Death Fame",
          value: formatFame(guild.deathFame),
          variant: "death",
        },
        {
          label: "Members",
          value: guild.memberCount?.toLocaleString() ?? "—",
          variant: "neutral",
        },
      ]}
    />
  );
}
