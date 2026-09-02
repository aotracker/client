import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DiscordFeedsPageClient } from "@/components/discord/DiscordFeedsPageClient";
import { getSession } from "@/lib/auth";
import { getDiscordFeedsList } from "@/lib/discord-feeds-list";
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
    robots: NOINDEX_FOLLOW,
    canonicalPath: "/account/discord",
    locale,
  });
}

export default async function AccountDiscordPage({
  params,
}: AccountDiscordPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession().catch(() => null);
  if (!session?.user) {
    return <DiscordFeedsPageClient />;
  }

  const tFeeds = await getTranslations("Discord.feeds");
  const result = await getDiscordFeedsList(session.user.id);
  if (!result.ok) {
    return (
      <DiscordFeedsPageClient
        hasInitialList
        initialListError={result.error}
        initialErrorMessage={
          result.error === "rate_limited"
            ? tFeeds("rateLimited")
            : result.error === "load_error"
              ? tFeeds("loadError")
              : null
        }
      />
    );
  }

  return (
    <DiscordFeedsPageClient
      hasInitialList
      initialGuilds={result.guilds}
      initialInviteUrl={result.inviteUrl}
    />
  );
}
