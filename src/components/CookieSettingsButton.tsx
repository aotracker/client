"use client";

import { openCookieConsentSettings } from "@/lib/cookie-consent";

export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={() => openCookieConsentSettings()}
    >
      {label}
    </button>
  );
}
