import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DiscordFeedsPageClient } from "@/components/discord/DiscordFeedsPageClient";
import { buildPageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

interface AccountDiscordPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: AccountDiscordPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });

  return buildPageMetadata({
    title: `${t("title")} · ${t("navDiscord")}`,
    description: t("discordMetaDescription", { siteName: SITE_NAME }),
    canonicalPath: "/account/discord",
    robots: NOINDEX_FOLLOW,
    locale,
  });
}

export default async function AccountDiscordPage({
  params,
}: AccountDiscordPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DiscordFeedsPageClient />;
}
