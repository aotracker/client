import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { buildPageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";

interface DiscordFeedsRedirectProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: DiscordFeedsRedirectProps): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: "Discord Notifications",
    description: "Configure Discord kill and death notifications for servers you administer.",
    canonicalPath: "/account/discord",
    robots: NOINDEX_FOLLOW,
    locale,
  });
}

/** Old URL; signed-in feed settings live under /account. */
export default async function DiscordFeedsRedirect({
  params,
}: DiscordFeedsRedirectProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/account/discord", locale });
}
