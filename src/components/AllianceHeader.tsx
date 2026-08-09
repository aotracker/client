import Link from "next/link";
import {
  formatAllianceTag,
  formatExactDateTime,
  formatFame,
  regionLabel,
} from "@/lib/utils";
import { EntityHeader } from "@/components/EntityHeader";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { CardContent } from "@/components/ui/card";
import { guildPath, playerPath } from "@/lib/seo";

interface AllianceHeaderProps {
  alliance: {
    name: string;
    albionId?: string;
    tag?: string | null;
    region: string;
    memberCount: number | null;
    guildCount: number;
    killFame?: number | null;
    deathFame?: number | null;
    founderId?: string | null;
    founderName?: string | null;
    founded?: string | null;
  };
  guilds?: { id: string; name: string }[];
  sharePath?: string;
}

export function AllianceHeader({
  alliance,
  guilds = [],
  sharePath,
}: AllianceHeaderProps) {
  const tagLabel = alliance.tag?.trim()
    ? formatAllianceTag(alliance.name, alliance.tag)
    : null;

  const affiliations = [
    { key: "region", label: regionLabel(alliance.region) },
    ...(tagLabel
      ? [{ key: "tag", label: tagLabel, title: alliance.name }]
      : []),
  ];

  const footerParts: React.ReactNode[] = [];
  if (alliance.founderName) {
    footerParts.push(
      <span key="founder" className="min-w-0 break-words">
        Founder:{" "}
        {alliance.founderName ? (
          <Link
            href={playerPath(alliance.region, alliance.founderName)}
            className="font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {alliance.founderName}
          </Link>
        ) : (
          <span className="font-medium text-foreground">
            {alliance.founderName}
          </span>
        )}
      </span>
    );
  }
  if (alliance.founded) {
    footerParts.push(
      <span key="founded" className="min-w-0 break-words">
        Founded: {formatExactDateTime(alliance.founded)}
      </span>
    );
  }

  return (
    <EntityHeader
      title={alliance.name}
      kind="Alliance"
      affiliations={affiliations}
      actions={sharePath ? <ShareLinkButton path={sharePath} /> : undefined}
      stats={[
        {
          label: "Kill Fame",
          mobileLabel: "Kills",
          value: formatFame(alliance.killFame),
          variant: "kill",
        },
        {
          label: "Death Fame",
          mobileLabel: "Deaths",
          value: formatFame(alliance.deathFame),
          variant: "death",
        },
        {
          label: "Members",
          value: alliance.memberCount?.toLocaleString() ?? "—",
          variant: "neutral",
        },
        {
          label: "Guilds",
          value: alliance.guildCount.toLocaleString(),
          variant: "neutral",
        },
      ]}
      entityId={alliance.albionId}
      entityIdLabel="Albion alliance ID"
      footerMeta={
        footerParts.length > 0 ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
            {footerParts}
          </div>
        ) : null
      }
    >
      <CardContent className="space-y-2 border-t border-border/40 pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Member guilds ({guilds.length})
        </h2>
        {guilds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No guilds in this alliance</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {guilds.map((guild) => (
              <Link
                key={guild.id}
                href={guildPath(alliance.region, guild.name)}
                className="max-w-full truncate rounded-md border border-border/50 bg-muted/25 px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {guild.name}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </EntityHeader>
  );
}
