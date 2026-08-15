import type { Metadata } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DocumentLang } from "@/components/DocumentLang";
import { Footer } from "@/components/Footer";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Navbar } from "@/components/Navbar";
import { RegionPreferenceSync } from "@/components/RegionPreferenceSync";
import { StatusBanner } from "@/components/StatusBanner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { getServerPreferredRegion } from "@/lib/region-preference-server";
import { SITE_NAME } from "@/lib/site";
import { getSiteUrl, languageAlternates } from "@/lib/seo";
import { getLocaleDefinition, LOCALE_CODES } from "@/i18n/locales";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return LOCALE_CODES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Seo" });
  const localeDef = getLocaleDefinition(locale);

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: t("defaultDescription"),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: localeDef.ogLocale,
    },
    alternates: {
      languages: languageAlternates("/"),
    },
    twitter: {
      card: "summary_large_image",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const preferredRegion = await getServerPreferredRegion();
  const localeDef = getLocaleDefinition(locale);

  return (
    <>
      <DocumentLang lang={localeDef.htmlLang} />
      <NextIntlClientProvider messages={messages}>
        <ThemeProvider>
          <ToastProvider>
            <RegionPreferenceSync />
            <Navbar regions={ENABLED_REGIONS} preferredRegion={preferredRegion} />
            <StatusBanner />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
              {children}
            </main>
            <Footer preferredRegion={preferredRegion} />
          </ToastProvider>
        </ThemeProvider>
      </NextIntlClientProvider>
      <Suspense fallback={null}>
        <GoogleAnalytics />
      </Suspense>
    </>
  );
}
