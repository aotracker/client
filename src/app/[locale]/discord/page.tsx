import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DiscordIcon } from "@/components/auth/AuthIcons";
import { DiscordFeedFiltersBuilder } from "@/components/discord/DiscordFeedFiltersBuilder";
import { DiscordSlashCommands } from "@/components/discord/DiscordSlashCommands";
import { PageHeader, PageSection } from "@/components/PageSection";
import { Button, buttonClassName } from "@/components/ui/button";
import { discordInviteUrl } from "@/lib/discord-invite";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

interface DiscordPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: DiscordPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Discord" });

  return buildPageMetadata({
    title: t("title"),
    description: t("metaDescription", { siteName: SITE_NAME }),
    canonicalPath: "/discord",
    locale,
  });
}

function notificationsLink(chunks: ReactNode) {
  return (
    <Link
      href="/account/discord"
      className="font-medium text-foreground underline-offset-4 hover:underline"
    >
      {chunks}
    </Link>
  );
}

export default async function DiscordPage({ params }: DiscordPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Discord");
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID?.trim();
  const inviteHref = clientId ? discordInviteUrl(clientId) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description", { siteName: SITE_NAME })}
      />

      <PageSection title={t("setupTitle")} description={t("setupIntro")}>
        <div className="space-y-5 text-sm text-muted-foreground">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <h3 className="font-display text-base font-semibold text-foreground">
                {t("setupSignInTitle")}
              </h3>
              <p>{t.rich("setupSignInBody", { notificationsLink })}</p>
            </div>
            <Link
              href="/account/discord"
              className={buttonClassName({
                size: "sm",
                className: "shrink-0",
              })}
            >
              <DiscordIcon className="h-4 w-4 text-discord" />
              {t("openNotifications")}
            </Link>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <h3 className="font-display text-base font-semibold text-foreground">
                {t("setupInviteTitle")}
              </h3>
              <p>{t("setupInviteBody")}</p>
            </div>
            {inviteHref ? (
              <Button href={inviteHref} variant="outline" size="sm">
                {t("invite")}
              </Button>
            ) : (
              <p>{t("inviteUnavailable")}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <h3 className="font-display text-base font-semibold text-foreground">
              {t("setupTrackTitle")}
            </h3>
            <p>{t("setupTrackBody")}</p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title={t("commandsTitle")}
        description={t("commandsIntro")}
        className="space-y-6"
      >
        <div className="space-y-6">
          <DiscordSlashCommands />
          <DiscordFeedFiltersBuilder />
        </div>
      </PageSection>

      <PageSection title={t("postsTitle")}>
        <p className="text-sm text-muted-foreground">
          {t("postsBody", { siteName: SITE_NAME })}
        </p>
      </PageSection>

      <p className="text-sm text-muted-foreground">{t("note")}</p>
    </div>
  );
}
