"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function pagePath(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Loads GA4 gtag and records App Router navigations.
 * No-ops when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset (local/dev safe).
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = GA_MEASUREMENT_ID?.trim();

  useEffect(() => {
    if (!id || typeof window.gtag !== "function") return;
    window.gtag("config", id, {
      page_path: pagePath(pathname, searchParams),
    });
  }, [id, pathname, searchParams]);

  if (!id) return null;

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
          gtag('js', new Date());
          gtag('config', '${id}');
        `}
      </Script>
    </>
  );
}
