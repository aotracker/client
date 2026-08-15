import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { DocumentLang } from "@/components/DocumentLang";
import { Footer } from "@/components/Footer";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Navbar } from "@/components/Navbar";
import { NotFoundRecovery } from "@/components/NotFoundRecovery";
import { RegionPreferenceSync } from "@/components/RegionPreferenceSync";
import { StatusBanner } from "@/components/StatusBanner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { ENABLED_REGIONS } from "@/lib/albion/types";
import { getServerPreferredRegion } from "@/lib/region-preference-server";
import { DEFAULT_LOCALE, getLocaleDefinition } from "@/i18n/locales";
import { notFoundMetadata } from "@/lib/seo";

export const metadata = notFoundMetadata();

/**
 * Root 404 for unmatched URLs and `notFound()` that bubbles past `[locale]`
 * (e.g. invalid locale in the locale layout). Locale-scoped 404s use
 * `[locale]/not-found.tsx` via the `[...rest]` catch-all.
 */
export default async function RootNotFound() {
  setRequestLocale(DEFAULT_LOCALE);
  const messages = await getMessages({ locale: DEFAULT_LOCALE });
  const preferredRegion = await getServerPreferredRegion();
  const localeDef = getLocaleDefinition(DEFAULT_LOCALE);

  return (
    <>
      <DocumentLang lang={localeDef.htmlLang} />
      <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
        <ThemeProvider>
          <ToastProvider>
            <RegionPreferenceSync />
            <Navbar
              regions={ENABLED_REGIONS}
              preferredRegion={preferredRegion}
            />
            <StatusBanner />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
              <div className="flex flex-col items-center justify-center py-16">
                <NotFoundRecovery />
              </div>
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
