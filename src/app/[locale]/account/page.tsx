import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountPageClient } from "@/components/account/AccountPageClient";
import { getSession } from "@/lib/auth";
import { getAccountOverview } from "@/lib/account-overview";
import { buildPageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

interface AccountPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: AccountPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Account" });

  return buildPageMetadata({
    title: t("title"),
    description: t("metaDescription", { siteName: SITE_NAME }),
    canonicalPath: "/account",
    robots: NOINDEX_FOLLOW,
    locale,
  });
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession().catch(() => null);
  const overview = session?.user ? await getAccountOverview(session) : null;

  return (
    <AccountPageClient
      initialMe={overview?.me ?? null}
      initialSessions={overview?.sessions ?? []}
    />
  );
}
