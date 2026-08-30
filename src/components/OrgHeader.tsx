import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { formatExactDateTime } from "@/lib/utils";
import { EntityHeader, type EntityAffiliation } from "@/components/EntityHeader";
import type { EntityStat } from "@/components/EntityStatStrip";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { WatchlistButton } from "@/components/watchlist/WatchlistButton";
import { playerPath } from "@/lib/seo";
import type { WatchlistEntityType } from "@/lib/watchlist";

export function orgFounderFooter({
  region,
  founderName,
  founded,
}: {
  region: string;
  founderName?: string | null;
  founded?: string | null;
}): ReactNode {
  const footerParts: ReactNode[] = [];
  if (founderName) {
    footerParts.push(
      <span key="founder" className="min-w-0 break-words">
        Founder:{" "}
        <Link
          href={playerPath(region, founderName)}
          className="font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {founderName}
        </Link>
      </span>
    );
  }
  if (founded) {
    footerParts.push(
      <span key="founded" className="min-w-0 break-words">
        Founded: {formatExactDateTime(founded)}
      </span>
    );
  }
  if (footerParts.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
      {footerParts}
    </div>
  );
}

export function OrgHeader({
  title,
  kind,
  region,
  albionId,
  watchlistType,
  affiliations,
  stats,
  sharePath,
  founderName,
  founded,
  entityIdLabel,
  lastSyncedAt,
  children,
  extraActions,
}: {
  title: string;
  kind: "Guild" | "Alliance";
  region: string;
  albionId?: string;
  watchlistType: Exclude<WatchlistEntityType, "player">;
  affiliations: EntityAffiliation[];
  stats: EntityStat[];
  sharePath?: string;
  founderName?: string | null;
  founded?: string | null;
  entityIdLabel: string;
  lastSyncedAt?: Date | null;
  children?: ReactNode;
  extraActions?: ReactNode;
}) {
  return (
    <EntityHeader
      title={title}
      kind={kind}
      affiliations={affiliations}
      actions={
        albionId || sharePath || extraActions ? (
          <div className="flex flex-wrap items-center gap-2">
            {extraActions}
            {albionId ? (
              <WatchlistButton
                type={watchlistType}
                region={region}
                albionId={albionId}
                name={title}
              />
            ) : null}
            {sharePath ? <ShareLinkButton path={sharePath} /> : null}
          </div>
        ) : undefined
      }
      stats={stats}
      entityId={albionId}
      entityIdLabel={entityIdLabel}
      lastUpdatedAt={lastSyncedAt}
      footerMeta={orgFounderFooter({ region, founderName, founded })}
    >
      {children}
    </EntityHeader>
  );
}
