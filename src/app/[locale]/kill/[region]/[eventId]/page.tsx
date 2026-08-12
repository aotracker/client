import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getKillEvent } from "@/lib/db/queries";
import { ensureKillEventQueued } from "@/lib/jobs/queue";
import type { AlbionEvent, AlbionPlayerRef, AlbionRegion } from "@/lib/albion/types";
import { isRegionEnabled } from "@/lib/albion/types";
import { resolveGuildAtKill } from "@/lib/albion/player-history";
import { KillDetailPending } from "@/components/KillDetailPending";
import { KillDetailView } from "@/components/KillDetailView";
import {
  KillGearFallback,
  KillGearWithEstimates,
} from "@/components/KillGearWithEstimates";
import {
  KillGuildFeud,
  KillGuildFeudFallback,
} from "@/components/KillGuildFeud";
import { formatFame, regionLabel } from "@/lib/utils";
import { JsonLd, killJsonLd } from "@/components/JsonLd";
import {
  buildPageMetadata,
  entityCanonical,
  entityPath,
  guildPath,
  killSeoDescription,
  killSeoTitle,
  notFoundMetadata,
  pendingEntityMetadata,
  playerPath,
} from "@/lib/seo";

interface PageProps {
  params: Promise<{ region: string; eventId: string }>;
}

const loadKillEvent = cache(async function loadKillEvent(
  region: AlbionRegion,
  eventId: number
) {
  const event = await getKillEvent(region, eventId);
  if (event) return { event, pending: false as const };

  await ensureKillEventQueued(region, eventId);
  return { event: null, pending: true as const };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { region, eventId } = await params;
  if (!isRegionEnabled(region)) return notFoundMetadata();
  const albionRegion = region as AlbionRegion;
  const parsedEventId = parseInt(eventId, 10);
  const path = entityPath("kill", region, parsedEventId);
  const result = await loadKillEvent(albionRegion, parsedEventId);

  if (result.pending) {
    return pendingEntityMetadata("Kill", path);
  }

  if (!result.event) return notFoundMetadata();

  const event = result.event;
  const { killer: killerGuild, victim: victimGuild } = guildsAtKill(event);
  const killerName = event.killer?.name ?? "?";
  const victimName = event.victim?.name ?? "?";
  const lootCount =
    event.items?.filter((i) => i.category === "inventory").length ?? 0;

  return buildPageMetadata({
    title: killSeoTitle(
      killerName,
      victimName,
      event.region,
      event.totalVictimKillFame
    ),
    description: killSeoDescription({
      region: event.region,
      killerName,
      victimName,
      killerGuild: killerGuild?.name,
      victimGuild: victimGuild?.name,
      killFame: event.totalVictimKillFame,
      contentType: event.contentType,
      participantCount: event.participantCount,
      battleId: event.albionBattleId,
      lootCount,
    }),
    canonicalPath: path,
    openGraphType: "article",
  });
}

export default async function KillDetailPage({ params }: PageProps) {
  const { region, eventId } = await params;
  if (!isRegionEnabled(region)) notFound();
  const albionRegion = region as AlbionRegion;
  const parsedEventId = parseInt(eventId, 10);
  const result = await loadKillEvent(albionRegion, parsedEventId);

  if (result.pending) {
    return <KillDetailPending region={region} eventId={parsedEventId} />;
  }

  const event = result.event;
  if (!event) notFound();

  const killerItems = event.items.filter((i) => i.ownerRole === "killer");
  const victimItems = event.items.filter((i) => i.ownerRole === "victim");
  const killerEquipment = killerItems.filter((i) => i.category === "equipment");
  const victimEquipment = victimItems.filter((i) => i.category === "equipment");
  const victimLoot = victimItems.filter((i) => i.category === "inventory");

  const killerParticipant = event.participants.find((p) => p.role === "killer");
  const victimParticipant = event.participants.find((p) => p.role === "victim");
  const { killer: killerGuild, victim: victimGuild } = guildsAtKill(event);
  const assistants = getAssistants(
    event.participants,
    event.killerId,
    event.victimId,
    event.region
  );

  const feudGuildA = killerGuild?.name?.trim() ?? "";
  const feudGuildB = victimGuild?.name?.trim() ?? "";
  const showGuildFeud =
    Boolean(feudGuildA) &&
    Boolean(feudGuildB) &&
    feudGuildA.toLowerCase() !== feudGuildB.toLowerCase();

  const killHeadline = `${event.killer?.name ?? "?"} killed ${event.victim?.name ?? "?"}`;
  const killDescription = `${formatFame(event.totalVictimKillFame)} fame · ${event.contentType} · ${regionLabel(event.region)}`;
  const sharePath = entityPath("kill", event.region, event.eventId);

  const gearSection = (
    <Suspense
      fallback={
        <KillGearFallback
          killerEquipment={killerEquipment}
          victimEquipment={victimEquipment}
          killerIp={killerParticipant?.averageItemPower ?? null}
          victimIp={victimParticipant?.averageItemPower ?? null}
        />
      }
    >
      <KillGearWithEstimates
        region={albionRegion}
        killerEquipment={killerEquipment}
        victimEquipment={victimEquipment}
        killerIp={killerParticipant?.averageItemPower ?? null}
        victimIp={victimParticipant?.averageItemPower ?? null}
      />
    </Suspense>
  );

  return (
    <>
      <JsonLd
        data={killJsonLd({
          headline: killHeadline,
          url: entityCanonical("kill", event.region, event.eventId),
          datePublished: event.occurredAt,
          description: killDescription,
          killerName: event.killer?.name,
          victimName: event.victim?.name,
        })}
      />
      <h1 className="sr-only">{killHeadline}</h1>
      <div className="space-y-6">
        <KillDetailView
          region={albionRegion}
          eventId={event.eventId}
          sharePath={sharePath}
          contentType={event.contentType}
          occurredAt={
            event.occurredAt instanceof Date
              ? event.occurredAt.toISOString()
              : String(event.occurredAt)
          }
          totalVictimKillFame={event.totalVictimKillFame}
          battleTotalPlayers={event.battle?.totalPlayers ?? null}
          killer={{
            name: event.killer?.name ?? "Unknown",
            albionId: event.killer?.albionId,
            guildName: killerGuild?.name,
            guildAlbionId: killerGuild?.albionId,
          }}
          victim={{
            name: event.victim?.name ?? "Unknown",
            albionId: event.victim?.albionId,
            guildName: victimGuild?.name,
            guildAlbionId: victimGuild?.albionId,
          }}
          killerIp={killerParticipant?.averageItemPower ?? null}
          victimIp={victimParticipant?.averageItemPower ?? null}
          killerEquipment={killerEquipment}
          victimEquipment={victimEquipment}
          victimLoot={victimLoot}
          assistants={assistants}
          gearSection={gearSection}
        />
        {showGuildFeud && (
          <section>
            <Suspense
              fallback={
                <KillGuildFeudFallback
                  guildA={feudGuildA}
                  guildB={feudGuildB}
                />
              }
            >
              <KillGuildFeud
                region={albionRegion}
                guildA={feudGuildA}
                guildB={feudGuildB}
                excludeEventId={event.eventId}
              />
            </Suspense>
          </section>
        )}
      </div>
    </>
  );
}

type KillEvent = NonNullable<Awaited<ReturnType<typeof getKillEvent>>>;

function guildsAtKill(event: KillEvent) {
  const payload = event.rawPayload as AlbionEvent;
  const killerParticipant = event.participants.find((p) => p.role === "killer");
  const victimParticipant = event.participants.find((p) => p.role === "victim");

  return {
    killer: resolveGuildAtKill(
      payload.Killer,
      killerParticipant?.guildName,
      event.killer?.guild ?? null
    ),
    victim: resolveGuildAtKill(
      payload.Victim,
      victimParticipant?.guildName,
      event.victim?.guild ?? null
    ),
  };
}

type KillParticipant = KillEvent["participants"][number];

function getAssistants(
  participants: KillParticipant[],
  killerId: string | null | undefined,
  victimId: string | null | undefined,
  region: string
) {
  const excludePlayerIds = new Set(
    [killerId, victimId].filter((id): id is string => Boolean(id))
  );
  const seen = new Set<string>();
  const assistants: {
    key: string;
    name: string;
    guildName?: string | null;
    guildHref?: string;
    profileHref?: string;
  }[] = [];

  for (const p of participants) {
    if (p.role !== "participant" && p.role !== "group_member") continue;
    if (p.playerId && excludePlayerIds.has(p.playerId)) continue;

    const albionId = p.player?.albionId;
    const playerName = p.player?.name ?? p.name;
    const dedupeKey = albionId ?? p.playerId ?? playerName ?? p.id;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const guildAtKill = resolveGuildAtKill(
      p.rawPayload as AlbionPlayerRef | undefined,
      p.guildName,
      p.player?.guild ?? null
    );

    assistants.push({
      key: dedupeKey,
      name: playerName ?? "Unknown",
      guildName: guildAtKill?.name,
      guildHref: guildAtKill?.name
        ? guildPath(region, guildAtKill.name)
        : undefined,
      profileHref: playerName ? playerPath(region, playerName) : undefined,
    });
  }

  return assistants.sort((a, b) => a.name.localeCompare(b.name));
}
