import { Link } from "@/i18n/navigation";
import { formatAllianceTag, formatFame, regionLabel } from "@/lib/utils";
import { OrgHeader } from "@/components/OrgHeader";
import { CardContent } from "@/components/ui/card";
import { guildPath } from "@/lib/seo";

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
    lastSyncedAt?: Date | null;
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

  return (
    <OrgHeader
      title={alliance.name}
      kind="Alliance"
      region={alliance.region}
      albionId={alliance.albionId}
      watchlistType="alliance"
      sharePath={sharePath}
      founderName={alliance.founderName}
      founded={alliance.founded}
      entityIdLabel="Albion alliance ID"
      lastSyncedAt={alliance.lastSyncedAt}
      affiliations={[
        { key: "region", label: regionLabel(alliance.region) },
        ...(tagLabel
          ? [{ key: "tag", label: tagLabel, title: alliance.name }]
          : []),
      ]}
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
                className="max-w-full truncate rounded-md border border-border/50 bg-muted/25 px-2.5 py-1.5 text-sm font-medium text-stat-neutral transition-colors hover:border-primary/40 hover:bg-muted/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {guild.name}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </OrgHeader>
  );
}
