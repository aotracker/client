import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/PageSection";
import { buildPageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

interface TermsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: TermsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Terms" });

  return buildPageMetadata({
    title: t("title"),
    description: t("metaDescription", { siteName: SITE_NAME }),
    canonicalPath: "/terms",
    robots: NOINDEX_FOLLOW,
    locale,
  });
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Terms");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("lastUpdated")} />

      <p className="text-sm text-muted-foreground">
        {t("intro", { siteName: SITE_NAME })}
      </p>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.serviceTitle")}
        </h2>
        <p>{t("sections.serviceBody", { siteName: SITE_NAME })}</p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.accountsTitle")}
        </h2>
        <p>{t("sections.accountsBody")}</p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.useTitle")}
        </h2>
        <p>{t("sections.useBody", { siteName: SITE_NAME })}</p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.dataTitle")}
        </h2>
        <p>{t("sections.dataBody", { siteName: SITE_NAME })}</p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.discordBotTitle")}
        </h2>
        <p>{t("sections.discordBotBody")}</p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.ipTitle")}
        </h2>
        <p>{t("sections.ipBody", { siteName: SITE_NAME })}</p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.disclaimerTitle")}
        </h2>
        <p>{t("sections.disclaimerBody", { siteName: SITE_NAME })}</p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.changesTitle")}
        </h2>
        <p>{t("sections.changesBody")}</p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.contactTitle")}
        </h2>
        <p>
          {t.rich("sections.contactBody", {
            privacyLink: (chunks) => (
              <Link
                href="/privacy"
                className="text-foreground underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
            contactLink: (chunks) => (
              <Link
                href="/contact"
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
