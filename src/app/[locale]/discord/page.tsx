import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DiscordIcon } from "@/components/auth/LoginButtons";
import { DiscordFeedFiltersBuilder } from "@/components/discord/DiscordFeedFiltersBuilder";
import { PageHeader, PageSection } from "@/components/PageSection";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const COMMANDS = [
  { name: "/track", key: "track" },
  { name: "/kills-channel", key: "killsChannel" },
  { name: "/deaths-channel", key: "deathsChannel" },
  { name: "/battles-channel", key: "battlesChannel" },
  { name: "/untrack", key: "untrack" },
  { name: "/status", key: "status" },
  { name: "/feed-filters", key: "feedFilters" },
  { name: "/ping-role", key: "pingRole" },
  { name: "/whoami", key: "whoami" },
  { name: "/lookup", key: "lookup" },
  { name: "/feud", key: "feud" },
  { name: "/watchlist-add", key: "watchlistAdd" },
] as const;

interface CommandCopy {
  usage: string;
  summary: string;
  detail: string;
  example: string;
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
  const commandCopy = t.raw("commands") as Record<
    (typeof COMMANDS)[number]["key"],
    CommandCopy
  >;
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID?.trim();
  const inviteHref = clientId ? discordInviteUrl(clientId) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description", { siteName: SITE_NAME })}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/account/discord"
              className={buttonClassName({ className: "shrink-0" })}
            >
              <DiscordIcon className="h-4 w-4 text-discord" />
              {t("openNotifications")}
            </Link>
            {inviteHref ? (
              <Button href={inviteHref} variant="outline">
                {t("invite")}
              </Button>
            ) : null}
          </div>
        }
      />

      {!inviteHref ? (
        <p className="text-sm text-muted-foreground">{t("inviteUnavailable")}</p>
      ) : null}

      <PageSection title={t("setupTitle")} description={t("setupIntro")}>
        <div className="space-y-5 text-sm text-muted-foreground">
          <div className="space-y-1.5">
            <h3 className="font-display text-base font-semibold text-foreground">
              {t("setupSignInTitle")}
            </h3>
            <p>{t.rich("setupSignInBody", { notificationsLink })}</p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-display text-base font-semibold text-foreground">
              {t("setupInviteTitle")}
            </h3>
            <p>{t("setupInviteBody")}</p>
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
          <div className="space-y-3">
            {COMMANDS.map((cmd) => {
              const copy = commandCopy[cmd.key];
              return (
                <Card key={cmd.key} variant="muted">
                  <CardContent className="space-y-2 p-4">
                    <div className="space-y-0.5">
                      <h3 className="font-mono text-sm font-semibold text-foreground">
                        {cmd.name}
                      </h3>
                      <p className="text-foreground/90">{copy.summary}</p>
                    </div>
                    <p>
                      <span className="text-label">{t("usageLabel")}</span>
                      <code className="mt-1 block overflow-x-auto rounded-md bg-muted px-3 py-1.5 font-mono text-sm text-foreground">
                        {copy.usage}
                      </code>
                    </p>
                    <p>{copy.detail}</p>
                    <p>
                      <span className="text-label">{t("exampleLabel")}</span>
                      <code className="mt-1 block overflow-x-auto rounded-md bg-muted px-3 py-1.5 font-mono text-sm text-foreground">
                        {copy.example}
                      </code>
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
