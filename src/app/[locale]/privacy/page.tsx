import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/PageSection";
import { buildPageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

interface PrivacyPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });

  return buildPageMetadata({
    title: t("title"),
    description: t("metaDescription", { siteName: SITE_NAME }),
    canonicalPath: "/privacy",
    robots: NOINDEX_FOLLOW,
    locale,
  });
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("lastUpdated")} />

      <p className="text-sm text-muted-foreground">
        {t("intro", { siteName: SITE_NAME })}
      </p>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.informationTitle")}
        </h2>
        <p>{t("sections.informationBody")}</p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.logsTitle")}
        </h2>
        <p>{t("sections.logsBody1")}</p>
        <p>
          {t.rich("sections.logsBody2", {
            googlePrivacyLink: (chunks) => (
              <a
                href="https://policies.google.com/privacy"
                className="text-foreground underline underline-offset-2"
                rel="noopener noreferrer"
                target="_blank"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.cookiesTitle")}
        </h2>
        <p>{t("sections.cookiesBody1")}</p>
        <p>{t("sections.cookiesBody2")}</p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.thirdPartyTitle")}
        </h2>
        <p>{t("sections.thirdPartyBody")}</p>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("sections.contactTitle")}
        </h2>
        <p>{t("sections.contactBody")}</p>
      </section>

      <p className="text-sm text-muted-foreground">
        {t("disclaimer", { siteName: SITE_NAME })}
      </p>
    </div>
  );
}
