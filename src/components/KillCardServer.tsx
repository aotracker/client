import { getLocale, getTranslations } from "next-intl/server";
import { buildKillCardCopy } from "@/components/kill-card-copy";
import {
  KillCardView,
  type KillCardViewProps,
} from "@/components/kill-card-view";

type KillCardProps = Omit<KillCardViewProps, "copy" | "locale">;

export async function KillCardServer(props: KillCardProps) {
  const [locale, t, tPlayer, tCommon, tMedia] = await Promise.all([
    getLocale(),
    getTranslations("Kill"),
    getTranslations("Player.killCard"),
    getTranslations("Common"),
    getTranslations("Media"),
  ]);
  const copy = buildKillCardCopy(t, tPlayer, tCommon, tMedia);

  return <KillCardView {...props} copy={copy} locale={locale} />;
}
