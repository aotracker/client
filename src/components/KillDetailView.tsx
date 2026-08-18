import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AlbionKillboardIcon } from "@/components/AlbionKillboardIcon";
import { BackLink } from "@/components/BackLink";
import { ContentBadge } from "@/components/ContentBadge";
import { EquipmentGrid, LootGrid } from "@/components/KillGearPanels";
import {
  KillEquipmentValue,
  KillEquipmentValueFallback,
} from "@/components/KillGearWithEstimates";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { StatValue, ItemPowerValue } from "@/components/StatValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SilverValue } from "@/components/SilverValue";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFame, formatItemPower } from "@/lib/utils";
import { guildPath, playerPath } from "@/lib/seo";
import { RelativeTime } from "@/components/RelativeTime";
import type { AlbionRegion } from "@/lib/albion/types";

export type KillDetailItem = {
  ownerRole: string;
  slot: string | null;
  itemType: string;
  quality: number | null;
  category: string;
  count?: number | null;
  estSilver?: number | null;
};

export type KillDetailAssistant = {
  key: string;
  name: string;
  role?: string;
  guildName?: string | null;
  guildHref?: string;
  profileHref?: string;
  healingDone?: number | null;
  averageItemPower?: string | null;
};

export type KillDetailViewProps = {
  region: AlbionRegion;
  eventId: number;
  sharePath: string;
  contentType: string;
  occurredAt: string;
  totalVictimKillFame: number | null;
  battleTotalPlayers: number | null;
  killer: {
    name: string;
    albionId?: string;
    guildName?: string | null;
    guildAlbionId?: string | null;
  };
  victim: {
    name: string;
    albionId?: string;
    guildName?: string | null;
    guildAlbionId?: string | null;
  };
  killerIp: string | null;
  victimIp: string | null;
  killerEquipment: KillDetailItem[];
  victimEquipment: KillDetailItem[];
  victimLoot: KillDetailItem[];
  assistants: KillDetailAssistant[];
  killerHealingDone?: number | null;
  victimHealingDone?: number | null;
  lootEstSilver?: number | null;
  lootSection?: React.ReactNode;
  compacted?: boolean;
};

export async function KillDetailView(props: KillDetailViewProps) {
  const t = await getTranslations("Kill");
  const tLabels = await getTranslations("Common.labels");
  const tRegions = await getTranslations("Common.regions");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <BackLink />
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {t("killId")}{" "}
            <span className="font-mono text-foreground">{props.eventId}</span>
            {props.battleTotalPlayers != null && (
              <span>
                {t("playersInBattle", { count: props.battleTotalPlayers })}
              </span>
            )}
          </p>
          <ShareLinkButton path={props.sharePath} />
        </div>
      </div>

      {props.compacted && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {t("compacted.body")}
        </p>
      )}

      <KillMatchCard
        {...props}
        killerLabel={t("killer")}
        victimLabel={t("victim")}
        killedLabel={t("killedHeading")}
        killFameLabel={t("killFame")}
        healingLabel={t("healing")}
        regionLabelText={
          tRegions.has(props.region) ? tRegions(props.region) : props.region
        }
      />

      {!props.compacted && (
        <AssistsSection
          assistants={props.assistants}
          title={t("participants", { count: props.assistants.length })}
          healingLabel={t("healing")}
          groupMemberLabel={t("roleGroupMember")}
          participantLabel={t("roleParticipant")}
        />
      )}
      {!props.compacted &&
        props.victimLoot.length > 0 &&
        (props.lootSection ?? (
          <LootSection
            victimLoot={props.victimLoot}
            lootEstSilver={props.lootEstSilver}
            title={t("victimLoot")}
            itemsDropped={t("itemsDropped", {
              count: props.victimLoot.length,
            })}
            lootDescription={t("lootDescription", {
              victimName: props.victim.name,
            })}
            estValueLabel={(value) => tLabels("estValue", { value })}
          />
        ))}
    </div>
  );
}

function KillMatchCard({
  killerLabel,
  victimLabel,
  killedLabel,
  killFameLabel,
  healingLabel,
  regionLabelText,
  ...props
}: KillDetailViewProps & {
  killerLabel: string;
  victimLabel: string;
  killedLabel: string;
  killFameLabel: string;
  healingLabel: string;
  regionLabelText: string;
}) {
  const showEquipment = !props.compacted;

  return (
    <Card className="overflow-hidden border-border/80 bg-card">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <PlayerColumn
            label={killerLabel}
            name={props.killer.name}
            guild={props.killer.guildName}
            guildHref={
              props.killer.guildName
                ? guildPath(props.region, props.killer.guildName)
                : undefined
            }
            profileHref={
              props.killer.name
                ? playerPath(props.region, props.killer.name)
                : undefined
            }
            itemPower={props.killerIp}
            healingDone={props.killerHealingDone}
            healingLabel={healingLabel}
            variant="killer"
            region={props.region}
            equipment={props.killerEquipment}
            showEquipment={showEquipment}
          />
          <MatchMeta
            killedLabel={killedLabel}
            killFameLabel={killFameLabel}
            fame={props.totalVictimKillFame}
            contentType={props.contentType}
            regionLabelText={regionLabelText}
            occurredAt={props.occurredAt}
          />
          <PlayerColumn
            label={victimLabel}
            name={props.victim.name}
            guild={props.victim.guildName}
            guildHref={
              props.victim.guildName
                ? guildPath(props.region, props.victim.guildName)
                : undefined
            }
            profileHref={
              props.victim.name
                ? playerPath(props.region, props.victim.name)
                : undefined
            }
            itemPower={props.victimIp}
            healingDone={props.victimHealingDone}
            healingLabel={healingLabel}
            variant="victim"
            region={props.region}
            equipment={props.victimEquipment}
            showEquipment={showEquipment}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MatchMeta({
  killedLabel,
  killFameLabel,
  fame,
  contentType,
  regionLabelText,
  occurredAt,
}: {
  killedLabel: string;
  killFameLabel: string;
  fame: number | null;
  contentType: string;
  regionLabelText: string;
  occurredAt: string;
}) {
  return (
    <div className="flex flex-col items-center border-y border-border bg-muted/10 px-5 py-5 lg:min-w-[12.5rem] lg:border-x lg:border-y-0 lg:px-6">
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          <AlbionKillboardIcon icon="skull" className="size-7" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">
            {killedLabel}
          </p>
        </div>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          <RelativeTime date={new Date(occurredAt)} />
        </p>
      </div>
      <div className="mt-6 flex flex-1 flex-col items-center justify-center lg:mt-8">
        <AlbionKillboardIcon icon="fame" className="mb-1.5 size-7" />
        <StatValue
          label={killFameLabel}
          value={formatFame(fame)}
          variant="fame"
          size="header"
        />
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <ContentBadge type={contentType} />
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {regionLabelText}
        </p>
      </div>
    </div>
  );
}

function AssistsSection({
  assistants,
  title,
  healingLabel,
  groupMemberLabel,
  participantLabel,
}: {
  assistants: KillDetailAssistant[];
  title: string;
  healingLabel: string;
  groupMemberLabel: string;
  participantLabel: string;
}) {
  if (assistants.length === 0) return null;
  return (
    <section className="rounded-lg border border-border/40 bg-muted/5 px-4 py-3">
      <h2 className="mb-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {title}
      </h2>
      <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {assistants.map((assistant) => (
          <li
            key={assistant.key}
            className="flex min-w-0 items-baseline text-sm"
          >
            <span className="min-w-0 truncate">
              {assistant.profileHref ? (
                <Link
                  href={assistant.profileHref}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {assistant.name}
                </Link>
              ) : (
                <span className="font-medium">{assistant.name}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {assistant.guildName && (
                  <>
                    {" "}
                    {assistant.guildHref ? (
                      <Link
                        href={assistant.guildHref}
                        className="hover:text-foreground hover:underline"
                      >
                        {assistant.guildName}
                      </Link>
                    ) : (
                      assistant.guildName
                    )}
                  </>
                )}
                {" · "}
                {assistant.role === "group_member"
                  ? groupMemberLabel
                  : participantLabel}
              </span>
            </span>
            {assistant.healingDone != null && assistant.healingDone > 0 && (
              <span className="shrink-0 text-xs tabular-nums text-foreground/70">
                <span className="text-muted-foreground/50"> · </span>
                {healingLabel} {assistant.healingDone.toLocaleString()}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LootSection({
  victimLoot,
  title,
  itemsDropped,
  lootDescription,
  lootEstSilver,
  estValueLabel,
  loading = false,
}: Pick<KillDetailViewProps, "victimLoot" | "lootEstSilver"> & {
  title: string;
  itemsDropped: string;
  lootDescription: string;
  estValueLabel?: (value: string) => string;
  loading?: boolean;
}) {
  return (
    <Card className="border-group/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <span className="flex shrink-0 items-center gap-3 text-sm font-normal text-muted-foreground">
            {loading ? (
              <Skeleton className="h-4 w-24" />
            ) : lootEstSilver != null &&
              lootEstSilver > 0 &&
              estValueLabel ? (
              <SilverValue
                amount={lootEstSilver}
                prefix={estValueLabel("").trim()}
              />
            ) : null}
            <span>{itemsDropped}</span>
          </span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{lootDescription}</p>
      </CardHeader>
      <CardContent>
        <LootGrid items={victimLoot} />
      </CardContent>
    </Card>
  );
}

function PlayerColumn({
  label,
  name,
  guild,
  guildHref,
  profileHref,
  itemPower,
  healingDone,
  healingLabel,
  variant,
  region,
  equipment,
  showEquipment,
}: {
  label: string;
  name: string;
  guild?: string | null;
  guildHref?: string;
  profileHref?: string;
  itemPower?: string | null;
  healingDone?: number | null;
  healingLabel?: string;
  variant: "killer" | "victim";
  region: AlbionRegion;
  equipment: KillDetailItem[];
  showEquipment: boolean;
}) {
  const nameEl = profileHref ? (
    <Link
      href={profileHref}
      className="block max-w-full truncate text-lg font-bold hover:underline sm:text-xl"
    >
      {name}
    </Link>
  ) : (
    <span className="block max-w-full truncate text-lg font-bold sm:text-xl">
      {name}
    </span>
  );

  const guildEl = guild ? (
    guildHref ? (
      <Link
        href={guildHref}
        className="mt-0.5 block max-w-full truncate text-sm text-muted-foreground hover:text-primary hover:underline"
      >
        {guild}
      </Link>
    ) : (
      <p className="mt-0.5 max-w-full truncate text-sm text-muted-foreground">
        {guild}
      </p>
    )
  ) : null;

  const ipEl = formatItemPower(itemPower) ? (
    <span className="inline-flex items-center gap-1">
      <AlbionKillboardIcon icon="shield" className="size-4" />
      <ItemPowerValue value={itemPower} className="text-sm" />
    </span>
  ) : null;

  const valueEl = showEquipment ? (
    <Suspense fallback={<KillEquipmentValueFallback />}>
      <KillEquipmentValue region={region} items={equipment} />
    </Suspense>
  ) : null;

  return (
    <div className="flex flex-col items-center px-4 py-5 text-center sm:px-5">
      <p
        className={`text-xs font-medium uppercase tracking-wide ${
          variant === "killer" ? "text-stat-kill" : "text-stat-death"
        }`}
      >
        {label}
      </p>
      <div className="mt-1 w-full min-w-0">{nameEl}</div>
      {guildEl}
      {(ipEl || valueEl) && (
        <div className="mt-1.5 flex items-center justify-center gap-3">
          {ipEl}
          {valueEl}
        </div>
      )}
      {healingDone != null && healingDone > 0 && healingLabel && (
        <p className="mt-1 text-xs text-muted-foreground">
          {healingLabel} {healingDone.toLocaleString()}
        </p>
      )}
      {showEquipment && (
        <div className="mt-3 w-full">
          <EquipmentGrid
            items={equipment}
            className="max-w-[240px] sm:max-w-[280px]"
          />
        </div>
      )}
    </div>
  );
}
