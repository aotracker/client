import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { TwitchWatchButton } from "@/components/media/TwitchWatchButton";
import { findKillWatchAround } from "@/lib/db/queries/media";
import {
  twitchChannelUrl,
  twitchVodOffsetForKill,
  twitchVodUrl,
} from "@/lib/media/urls";
import type { AlbionRegion } from "@/lib/albion/types";

export async function KillWatchAround({
  region,
  occurredAt,
  killerAlbionId,
  victimAlbionId,
  killerName,
  victimName,
}: {
  region: AlbionRegion;
  occurredAt: Date;
  killerAlbionId?: string;
  victimAlbionId?: string;
  killerName: string;
  victimName: string;
}) {
  const ids = [killerAlbionId, victimAlbionId].filter(
    (id): id is string => Boolean(id)
  );
  if (ids.length === 0) return null;

  const matches = await findKillWatchAround({
    region,
    occurredAt,
    playerAlbionIds: ids,
  });
  if (matches.length === 0) return null;

  const t = await getTranslations("Media");

  return (
    <div className="space-y-2">
      {matches.map((match) => {
        const offsetSec = twitchVodOffsetForKill(
          occurredAt,
          match.session.startedAt
        );
        const isKiller = match.playerAlbionId === killerAlbionId;
        const name = isKiller ? killerName : victimName;
        const href =
          match.session.vodId
            ? twitchVodUrl(match.session.vodId, offsetSec)
            : twitchChannelUrl(match.login);
        return (
          <Card key={match.playerAlbionId} variant="muted">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <p className="text-sm">
                {match.session.vodId
                  ? t("watchAroundKill", { name })
                  : t("watchLiveInstead", { name })}
              </p>
              <TwitchWatchButton href={href}>
                {match.session.vodId ? t("watchVod") : t("watch")}
              </TwitchWatchButton>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
