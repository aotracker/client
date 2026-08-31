"use client";

import { useSyncExternalStore } from "react";

/**
 * First-party cookie consent (GDPR / ePrivacy).
 * Necessary cookies do not need a prompt; analytics (GA4) does.
 */

export const COOKIE_CONSENT_STORAGE_KEY = "aotracker:cookie-consent";
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_CHANGE_EVENT = "aotracker:cookie-consent-change";
export const COOKIE_CONSENT_OPEN_EVENT = "aotracker:cookie-consent-open";

export type CookieConsent = {
  version: number;
  analytics: boolean;
  updatedAt: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Parse stored JSON. Unknown or stale versions return null so we re-prompt. */
export function parseCookieConsent(
  raw: string | null | undefined
): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (typeof parsed.analytics !== "boolean") return null;
    if (typeof parsed.updatedAt !== "number" || !Number.isFinite(parsed.updatedAt)) {
      return null;
    }
    return {
      version: COOKIE_CONSENT_VERSION,
      analytics: parsed.analytics,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

let cachedRaw: string | null | undefined;
let cachedConsent: CookieConsent | null = null;

function invalidateConsentCache() {
  cachedRaw = undefined;
  cachedConsent = null;
}

function readRawConsent(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getCookieConsentSnapshot(): CookieConsent | null {
  const raw = readRawConsent();
  if (raw === cachedRaw) return cachedConsent;
  cachedRaw = raw;
  cachedConsent = parseCookieConsent(raw);
  return cachedConsent;
}

export function getServerCookieConsentSnapshot(): CookieConsent | null {
  return null;
}

export function subscribeCookieConsent(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function writeCookieConsent(analytics: boolean): CookieConsent {
  const consent: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    analytics,
    updatedAt: Date.now(),
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
    } catch {
      // ignore quota / private mode
    }
    invalidateConsentCache();
    window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGE_EVENT));
  }
  return consent;
}

/** Re-open the banner after a choice was already made. */
export function openCookieConsentSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT));
}

export function subscribeCookieConsentOpen(onOpen: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
  return () => {
    window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
  };
}

function subscribeClientReady() {
  return () => {};
}

/** False during SSR/hydration; true after the client commits. */
export function useCookieConsentClientReady(): boolean {
  return useSyncExternalStore(subscribeClientReady, () => true, () => false);
}

export function useCookieConsent(): CookieConsent | null {
  return useSyncExternalStore(
    subscribeCookieConsent,
    getCookieConsentSnapshot,
    getServerCookieConsentSnapshot
  );
}
