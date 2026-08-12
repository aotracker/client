import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("lastUpdated")}</p>
      </div>

      <div className="space-y-4 text-sm text-muted-foreground">
        <p>{t("intro", { siteName: SITE_NAME })}</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            {t("sections.informationTitle")}
          </h2>
          <p>{t("sections.informationBody")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
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

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            {t("sections.cookiesTitle")}
          </h2>
          <p>{t("sections.cookiesBody1")}</p>
          <p>{t("sections.cookiesBody2")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            {t("sections.thirdPartyTitle")}
          </h2>
          <p>{t("sections.thirdPartyBody")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            {t("sections.contactTitle")}
          </h2>
          <p>{t("sections.contactBody")}</p>
        </section>

        <p>{t("disclaimer", { siteName: SITE_NAME })}</p>
      </div>
    </div>
  );
}
