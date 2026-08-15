import {
  getDefaultRegion,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";

/** Site-wide region preference, including "all regions". */
export type PreferredRegion = AlbionRegion | "all";

/** Cookie read by server components and proxy. */
export const PREFERRED_REGION_COOKIE = "aotracker_preferred_region";

/** Current localStorage key for the site-wide region preference. */
export const PREFERRED_REGION_STORAGE_KEY = "aotracker:preferred-region";

/** Legacy key from search-only storage (migrated on read). */
const LEGACY_SEARCH_REGION_STORAGE_KEY = "aotrackr:search-region";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isPreferredRegion(value: string): value is PreferredRegion {
  return value === "all" || isRegionEnabled(value);
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function parseRegionValue(
  value: string | null | undefined
): PreferredRegion | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return isPreferredRegion(normalized) ? normalized : null;
}

function readLegacyLocalStorageRegion(): PreferredRegion | null {
  if (!canUseStorage()) return null;
  try {
    return parseRegionValue(localStorage.getItem(LEGACY_SEARCH_REGION_STORAGE_KEY));
  } catch {
    return null;
  }
}

function readLocalStorageRegion(): PreferredRegion | null {
  if (!canUseStorage()) return null;
  try {
    const current = parseRegionValue(
      localStorage.getItem(PREFERRED_REGION_STORAGE_KEY)
    );
    if (current) return current;
    return readLegacyLocalStorageRegion();
  } catch {
    return null;
  }
}

function readDocumentCookieRegion(): PreferredRegion | null {
  if (typeof document === "undefined") return null;
  const prefix = `${PREFERRED_REGION_COOKIE}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!match) return null;
  return parseRegionValue(decodeURIComponent(match.slice(prefix.length)));
}

function writeLocalStorageRegion(region: PreferredRegion): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(PREFERRED_REGION_STORAGE_KEY, region);
    localStorage.removeItem(LEGACY_SEARCH_REGION_STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

/** Client-only: persist preference to localStorage and a readable cookie. */
export function writePreferredRegionCookie(region: PreferredRegion): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${PREFERRED_REGION_COOKIE}=${encodeURIComponent(region)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

/** Client-only: stored preference without falling back to a default. */
export function getStoredPreferredRegion(): PreferredRegion | null {
  return readLocalStorageRegion() ?? readDocumentCookieRegion();
}

/**
 * Client-only: read stored preference, falling back when unset or invalid.
 * Default is "all" — never Americas unless the user chose it.
 */
export function getPreferredRegion(
  fallback: PreferredRegion = "all"
): PreferredRegion {
  return (
    readLocalStorageRegion() ?? readDocumentCookieRegion() ?? fallback
  );
}

/** Client-only: set the site-wide preferred region (localStorage + cookie). */
export function setPreferredRegion(region: PreferredRegion): void {
  if (!isPreferredRegion(region)) return;
  writeLocalStorageRegion(region);
  writePreferredRegionCookie(region);
}

/** Concrete server for killboard deep-links when preference is "all". */
export function concreteRegion(
  pref: PreferredRegion | null | undefined
): AlbionRegion {
  if (pref && pref !== "all" && isRegionEnabled(pref)) return pref;
  return getDefaultRegion();
}

/**
 * Client-only: ensure localStorage and cookie agree (e.g. after upgrade or
 * cookie cleared). Call once on app load.
 */
export function syncPreferredRegionStores(): void {
  const fromStorage = readLocalStorageRegion();
  const fromCookie = readDocumentCookieRegion();

  if (fromStorage) {
    if (fromStorage !== fromCookie) {
      writePreferredRegionCookie(fromStorage);
    }
    if (readLegacyLocalStorageRegion()) {
      writeLocalStorageRegion(fromStorage);
    }
    return;
  }

  if (fromCookie) {
    writeLocalStorageRegion(fromCookie);
    return;
  }

  const legacy = readLegacyLocalStorageRegion();
  if (legacy) {
    setPreferredRegion(legacy);
  }
}

/** Parse `Cookie` header value (server/proxy). */
export function parsePreferredRegionCookieHeader(
  cookieHeader: string | null | undefined
): PreferredRegion | null {
  if (!cookieHeader) return null;
  const prefix = `${PREFERRED_REGION_COOKIE}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) continue;
    return parseRegionValue(
      decodeURIComponent(trimmed.slice(prefix.length))
    );
  }
  return null;
}

export function getStoredSearchRegion(
  fallback: PreferredRegion = "all"
): PreferredRegion {
  return getPreferredRegion(fallback);
}

/** @deprecated Use setPreferredRegion */
export function setStoredSearchRegion(region: PreferredRegion): void {
  setPreferredRegion(region);
}
