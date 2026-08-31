"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  subscribeCookieConsentOpen,
  useCookieConsent,
  useCookieConsentClientReady,
  writeCookieConsent,
} from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const t = useTranslations("CookieConsent");
  const ready = useCookieConsentClientReady();
  const consent = useCookieConsent();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => subscribeCookieConsentOpen(() => setSettingsOpen(true)), []);

  if (!ready) return null;
  if (consent && !settingsOpen) return null;

  function choose(analytics: boolean) {
    writeCookieConsent(analytics);
    setSettingsOpen(false);
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] p-4"
      role="region"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-body"
    >
      <Card className="pointer-events-auto mx-auto max-w-6xl animate-slide-up p-4 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2
              id="cookie-consent-title"
              className="font-display text-lg font-semibold text-foreground"
            >
              {t("title")}
            </h2>
            <p
              id="cookie-consent-body"
              className="text-sm text-muted-foreground"
            >
              {t.rich("body", {
                privacyLink: (chunks) => (
                  <Link
                    href="/privacy"
                    className="text-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => choose(false)}
            >
              {t("reject")}
            </Button>
            <Button type="button" size="sm" onClick={() => choose(true)}>
              {t("accept")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
