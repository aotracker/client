import Link from "next/link";
import {
  formatAllianceTag,
  formatExactDateTime,
  formatFame,
  regionLabel,
} from "@/lib/utils";
import { EntityHeader } from "@/components/EntityHeader";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { WatchlistButton } from "@/components/watchlist/WatchlistButton";

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
  const allianceLabel = guild.allianceName
    ? formatAllianceTag(guild.allianceName, guild.allianceTag)
    : null;

  const affiliations = [
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
  ];

  const footerParts: React.ReactNode[] = [];
  if (guild.founderName) {
    footerParts.push(
      <span key="founder" className="min-w-0 break-words">
        Founder:{" "}
        {guild.founderId ? (
          <Link
            href={`/player/${guild.region}/${guild.founderId}`}
            className="font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {guild.founderName}
          </Link>
        ) : (
          <span className="font-medium text-foreground">{guild.founderName}</span>
        )}
      </span>
    );
  }
  if (guild.founded) {
    footerParts.push(
      <span key="founded" className="min-w-0 break-words">
        Founded: {formatExactDateTime(guild.founded)}
      </span>
    );
  }
  if (guild.lastSyncedAt) {
    footerParts.push(
      <p key="synced" className="text-xs">
        Last updated: {formatExactDateTime(guild.lastSyncedAt)}
      </p>
    );
  }

  return (
    <EntityHeader
      title={guild.name}
      kind="Guild"
      affiliations={affiliations}
      actions={
        guild.albionId ? (
          <div className="flex flex-wrap items-center gap-2">
            <WatchlistButton
              type="guild"
              region={guild.region}
              albionId={guild.albionId}
              name={guild.name}
            />
            {sharePath ? <ShareLinkButton path={sharePath} /> : null}
          </div>
        ) : sharePath ? (
          <ShareLinkButton path={sharePath} />
        ) : undefined
      }
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
      entityId={guild.albionId}
      entityIdLabel="Albion guild ID"
      footerMeta={
        footerParts.length > 0 ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
            {footerParts}
          </div>
        ) : null
      }
    />
  );
}
