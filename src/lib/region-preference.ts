import {
  getDefaultRegion,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";

/** Cookie read by server components and middleware. */
export const PREFERRED_REGION_COOKIE = "aotracker_preferred_region";

/** Current localStorage key for the site-wide region preference. */
export const PREFERRED_REGION_STORAGE_KEY = "aotracker:preferred-region";

/** Legacy key from search-only storage (migrated on read). */
const LEGACY_SEARCH_REGION_STORAGE_KEY = "aotrackr:search-region";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function parseRegionValue(value: string | null | undefined): AlbionRegion | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return isRegionEnabled(normalized) ? normalized : null;
}

function readLegacyLocalStorageRegion(): AlbionRegion | null {
  if (!canUseStorage()) return null;
  try {
    return parseRegionValue(localStorage.getItem(LEGACY_SEARCH_REGION_STORAGE_KEY));
  } catch {
    return null;
  }
}

function readLocalStorageRegion(): AlbionRegion | null {
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

function readDocumentCookieRegion(): AlbionRegion | null {
  if (typeof document === "undefined") return null;
  const prefix = `${PREFERRED_REGION_COOKIE}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!match) return null;
  return parseRegionValue(decodeURIComponent(match.slice(prefix.length)));
}

function writeLocalStorageRegion(region: AlbionRegion): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(PREFERRED_REGION_STORAGE_KEY, region);
    localStorage.removeItem(LEGACY_SEARCH_REGION_STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

/** Client-only: persist preference to localStorage and a readable cookie. */
export function writePreferredRegionCookie(region: AlbionRegion): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${PREFERRED_REGION_COOKIE}=${encodeURIComponent(region)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

/** Client-only: stored preference without falling back to site default. */
export function getStoredPreferredRegion(): AlbionRegion | null {
  return readLocalStorageRegion() ?? readDocumentCookieRegion();
}

/** Client-only: read stored preference, falling back when unset or invalid. */
export function getPreferredRegion(fallback?: AlbionRegion): AlbionRegion {
  const resolvedFallback = fallback ?? getDefaultRegion();
  return (
    readLocalStorageRegion() ??
    readDocumentCookieRegion() ??
    resolvedFallback
  );
}

/** Client-only: set the site-wide preferred region (localStorage + cookie). */
export function setPreferredRegion(region: AlbionRegion): void {
  if (!isRegionEnabled(region)) return;
  writeLocalStorageRegion(region);
  writePreferredRegionCookie(region);
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

/** Parse `Cookie` header value (server/middleware). */
export function parsePreferredRegionCookieHeader(
  cookieHeader: string | null | undefined
): AlbionRegion | null {
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

export function getStoredSearchRegion(fallback: AlbionRegion): AlbionRegion {
  return getPreferredRegion(fallback);
}

/** @deprecated Use setPreferredRegion */
export function setStoredSearchRegion(region: AlbionRegion): void {
  setPreferredRegion(region);
}
