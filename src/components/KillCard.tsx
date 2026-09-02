"use client";

import { useLocale, useTranslations } from "next-intl";
import { buildKillCardCopy } from "@/components/kill-card-copy";
import {
  KillCardView,
  type KillCardViewProps,
} from "@/components/kill-card-view";

export type { KillCardEvent } from "@/components/kill-card-view";

type KillCardProps = Omit<KillCardViewProps, "copy" | "locale">;

export function KillCard(props: KillCardProps) {
  const locale = useLocale();
  const t = useTranslations("Kill");
  const tPlayer = useTranslations("Player.killCard");
  const tCommon = useTranslations("Common");
  const tMedia = useTranslations("Media");
  const copy = buildKillCardCopy(t, tPlayer, tCommon, tMedia);

  return <KillCardView {...props} copy={copy} locale={locale} />;
}
