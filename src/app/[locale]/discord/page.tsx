import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/PageSection";
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

const KILL_FEED_PREVIEW_EMBED =
  "https://cdn.aotracker.net/images/aotracker-kill-discord-notification-2.png";
const KILL_FEED_PREVIEW =
  "https://cdn.aotracker.net/images/aotracker-kill-discord-notification.png";

const COMMANDS = [
  { name: "/track", key: "track" },
  { name: "/kills-channel", key: "killsChannel" },
  { name: "/deaths-channel", key: "deathsChannel" },
  { name: "/untrack", key: "untrack" },
  { name: "/status", key: "status" },
] as const;

interface CommandCopy {
  usage: string;
  summary: string;
  detail: string;
  example: string;
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
      />

      {inviteHref ? (
        <a
          href={inviteHref}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t("invite")}
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">{t("inviteUnavailable")}</p>
      )}

      <figure className="max-w-4xl space-y-2">
        <div className="flex flex-col items-start gap-3 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={KILL_FEED_PREVIEW_EMBED}
            alt={t("previewAltEmbed")}
            className="h-auto w-full max-w-sm rounded-lg border border-border bg-card/40"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={KILL_FEED_PREVIEW}
            alt={t("previewAlt")}
            className="h-auto w-full max-w-md rounded-lg border border-border bg-card/40"
          />
        </div>
        <figcaption className="text-sm text-muted-foreground">
          {t("previewCaption")}
        </figcaption>
      </figure>

      <section className="space-y-5 text-sm text-muted-foreground">
        <div className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("setupTitle")}
          </h2>
          <p>{t("setupIntro")}</p>
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-base font-semibold text-foreground">
            {t("setupAddTitle")}
          </h3>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>{t("setupAdd1")}</li>
            <li>{t("setupAdd2")}</li>
            <li>{t("setupAdd3")}</li>
          </ol>
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-base font-semibold text-foreground">
            {t("setupRegisterTitle")}
          </h3>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>{t("setupRegister1")}</li>
            <li>{t("setupRegister2")}</li>
            <li>{t("setupRegister3")}</li>
            <li>{t("setupRegister4")}</li>
          </ol>
        </div>
        <p>{t("permissionsNote")}</p>
      </section>

      <section className="space-y-4 text-sm text-muted-foreground">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("commandsTitle")}
          </h2>
          <p>{t("commandsIntro")}</p>
        </div>
        <div className="space-y-3">
          {COMMANDS.map((cmd) => {
            const copy = commandCopy[cmd.key];
            return (
              <article
                key={cmd.key}
                className="space-y-2 rounded-lg border border-border bg-card/40 px-4 py-3"
              >
                <div className="space-y-0.5">
                  <h3 className="font-mono text-sm font-semibold text-foreground">
                    {cmd.name}
                  </h3>
                  <p className="text-foreground/90">{copy.summary}</p>
                </div>
                <p>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("usageLabel")}
                  </span>
                  <code className="mt-1 block overflow-x-auto rounded-md bg-muted px-2.5 py-1.5 font-mono text-[13px] text-foreground">
                    {copy.usage}
                  </code>
                </p>
                <p>{copy.detail}</p>
                <p>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("exampleLabel")}
                  </span>
                  <code className="mt-1 block overflow-x-auto rounded-md bg-muted/70 px-2.5 py-1.5 font-mono text-[13px] text-foreground">
                    {copy.example}
                  </code>
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("postsTitle")}
        </h2>
        <p>{t("postsBody", { siteName: SITE_NAME })}</p>
      </section>

      <p className="text-sm text-muted-foreground">{t("note")}</p>
    </div>
  );
}
