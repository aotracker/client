"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useCookieConsent } from "@/lib/cookie-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const DENIED_CONSENT = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

function pagePath(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function setGaDisabled(id: string, disabled: boolean) {
  (window as unknown as Record<string, boolean>)[`ga-disable-${id}`] = disabled;
}

/**
 * Loads GA4 only after analytics consent. Advertising storage stays denied.
 * No-ops when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset (local/dev safe).
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consent = useCookieConsent();
  const id = GA_MEASUREMENT_ID?.trim();
  const analyticsAllowed = consent?.analytics === true;

  useEffect(() => {
    if (!id) return;

    if (analyticsAllowed) {
      setGaDisabled(id, false);
      if (typeof window.gtag !== "function") return;
      window.gtag("consent", "update", {
        ...DENIED_CONSENT,
        analytics_storage: "granted",
      });
      window.gtag("config", id, {
        page_path: pagePath(pathname, searchParams),
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      return;
    }

    if (!consent) return;
    setGaDisabled(id, true);
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", DENIED_CONSENT);
    }
  }, [id, analyticsAllowed, consent, pathname, searchParams]);

  if (!id || !analyticsAllowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
          gtag('js', new Date());
          gtag('config', '${id}', {
            allow_google_signals: false,
            allow_ad_personalization_signals: false
          });
        `}
      </Script>
    </>
  );
}
