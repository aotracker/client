import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/PageSection";
import { Button } from "@/components/ui/button";
import { buildPageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { DISCORD_SERVER_INVITE_URL, SITE_NAME } from "@/lib/site";

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });

  return buildPageMetadata({
    title: t("title"),
    description: t("metaDescription", { siteName: SITE_NAME }),
    canonicalPath: "/contact",
    robots: NOINDEX_FOLLOW,
    locale,
  });
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("intro")} />

      <section className="space-y-3 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.generalTitle")}
        </h2>
        <p>
          {t.rich("sections.generalBody", {
            siteName: SITE_NAME,
            discordLink: (chunks) => (
              <a
                href={DISCORD_SERVER_INVITE_URL}
                className="text-foreground underline underline-offset-2"
                rel="noopener noreferrer"
                target="_blank"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
        <Button
          href={DISCORD_SERVER_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("joinDiscord")}
        </Button>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.discordTitle")}
        </h2>
        <p>
          {t.rich("sections.discordBody", {
            discordLink: (chunks) => (
              <Link
                href="/discord"
                className="text-foreground underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.privacyTitle")}
        </h2>
        <p>
          {t.rich("sections.privacyBody", {
            privacyLink: (chunks) => (
              <Link
                href="/privacy"
                className="text-foreground underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </section>
    </div>
  );
}
