import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Swords } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { ContentBadge } from "@/components/ContentBadge";
import { EquipmentGrid, LootGrid } from "@/components/KillGearPanels";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { StatValue, ItemPowerValue } from "@/components/StatValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatFame,
  formatItemPower,
  formatSilver,
} from "@/lib/utils";
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
  killerEstSilver?: number | null;
  victimEstSilver?: number | null;
  lootEstSilver?: number | null;
  gearSection?: React.ReactNode;
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

      <div className="lg:sticky lg:top-[57px] lg:z-30">
        <KillSummaryCard
          {...props}
          killerLabel={t("killer")}
          victimLabel={t("victim")}
          killFameLabel={t("killFame")}
          healingLabel={t("healing")}
          regionLabelText={
            tRegions.has(props.region) ? tRegions(props.region) : props.region
          }
        />
      </div>

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
        (props.gearSection ?? (
        <GearSection
          {...props}
          killerEquipmentTitle={t("killerEquipment")}
          victimEquipmentTitle={t("victimEquipment")}
          estValueLabel={(value) => tLabels("estValue", { value })}
          averageIpLabel={tLabels("averageIp")}
        />
      ))}
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

function KillSummaryCard({
  killerLabel,
  victimLabel,
  killFameLabel,
  healingLabel,
  regionLabelText,
  ...props
}: KillDetailViewProps & {
  killerLabel: string;
  victimLabel: string;
  killFameLabel: string;
  healingLabel: string;
  regionLabelText: string;
}) {
  return (
    <Card className="overflow-hidden border-border/80 bg-card/95 backdrop-blur">
      <CardContent className="p-0">
        <div className="flex flex-col items-stretch sm:flex-row">
          <PlayerSummary
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
          />
          <div className="flex flex-col items-center justify-center border-y border-border bg-muted/10 px-6 py-6 sm:border-x sm:border-y-0">
            <Swords className="mb-2 h-8 w-8 text-muted-foreground" />
            <StatValue
              label={killFameLabel}
              value={formatFame(props.totalVictimKillFame)}
              variant="fame"
              size="header"
            />
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <ContentBadge type={props.contentType} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {regionLabelText} ·{" "}
              <RelativeTime date={new Date(props.occurredAt)} />
            </p>
          </div>
          <PlayerSummary
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
          />
        </div>
      </CardContent>
    </Card>
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
    <div className="rounded-lg border border-border/40 bg-muted/5 px-4 py-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {title}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {assistants.map((assistant) => (
          <li key={assistant.key} className="text-sm text-muted-foreground">
            {assistant.profileHref ? (
              <Link
                href={assistant.profileHref}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                {assistant.name}
              </Link>
            ) : (
              <span>{assistant.name}</span>
            )}
            {assistant.guildName && (
              <span className="ml-1 text-xs text-muted-foreground/70">
                ·{" "}
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
              </span>
            )}
            <span className="ml-1 text-xs text-muted-foreground/70">
              ·{" "}
              {assistant.role === "group_member"
                ? groupMemberLabel
                : participantLabel}
            </span>
            {assistant.healingDone != null && assistant.healingDone > 0 && (
              <span className="ml-1 text-xs text-stat-fame">
                · {healingLabel} {assistant.healingDone.toLocaleString()}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GearSection({
  killerEquipment,
  victimEquipment,
  killerIp,
  victimIp,
  killerEstSilver,
  victimEstSilver,
  killerEquipmentTitle,
  victimEquipmentTitle,
  estValueLabel,
  averageIpLabel,
}: KillDetailViewProps & {
  killerEquipmentTitle: string;
  victimEquipmentTitle: string;
  estValueLabel: (value: string) => string;
  averageIpLabel: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base text-stat-kill">
              {killerEquipmentTitle}
            </CardTitle>
            {killerEstSilver != null && killerEstSilver > 0 && (
              <p className="shrink-0 text-sm text-muted-foreground">
                {estValueLabel(formatSilver(killerEstSilver))}
              </p>
            )}
          </div>
          {formatItemPower(killerIp) && (
            <p className="text-sm text-muted-foreground">
              {averageIpLabel}{" "}
              <ItemPowerValue value={killerIp} withSuffix={false} />
            </p>
          )}
        </CardHeader>
        <CardContent>
          <EquipmentGrid items={killerEquipment} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base text-stat-death">
              {victimEquipmentTitle}
            </CardTitle>
            {victimEstSilver != null && victimEstSilver > 0 && (
              <p className="shrink-0 text-sm text-muted-foreground">
                {estValueLabel(formatSilver(victimEstSilver))}
              </p>
            )}
          </div>
          {formatItemPower(victimIp) && (
            <p className="text-sm text-muted-foreground">
              {averageIpLabel}{" "}
              <ItemPowerValue value={victimIp} withSuffix={false} />
            </p>
          )}
        </CardHeader>
        <CardContent>
          <EquipmentGrid items={victimEquipment} />
        </CardContent>
      </Card>
    </div>
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
              <span>{estValueLabel(formatSilver(lootEstSilver))}</span>
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

function PlayerSummary({
  label,
  name,
  guild,
  guildHref,
  profileHref,
  itemPower,
  healingDone,
  healingLabel,
  variant,
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
}) {
  const nameEl = profileHref ? (
    <Link href={profileHref} className="text-xl font-bold hover:underline">
      {name}
    </Link>
  ) : (
    <span className="text-xl font-bold">{name}</span>
  );

  const guildEl = guild ? (
    guildHref ? (
      <Link
        href={guildHref}
        className="mt-1 text-sm text-muted-foreground hover:text-primary hover:underline"
      >
        {guild}
      </Link>
    ) : (
      <p className="mt-1 text-sm text-muted-foreground">{guild}</p>
    )
  ) : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <p
        className={`text-xs font-medium uppercase tracking-wide ${
          variant === "killer" ? "text-stat-kill" : "text-stat-death"
        }`}
      >
        {label}
      </p>
      <div className="mt-1">{nameEl}</div>
      {guildEl}
      {formatItemPower(itemPower) && (
        <p className="mt-2 text-xs text-muted-foreground">
          <ItemPowerValue value={itemPower} />
        </p>
      )}
      {healingDone != null && healingDone > 0 && healingLabel && (
        <p className="mt-1 text-xs text-stat-fame">
          {healingLabel} {healingDone.toLocaleString()}
        </p>
      )}
    </div>
  );
}
