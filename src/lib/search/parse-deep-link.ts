import {
  ENABLED_REGIONS,
  isRegionEnabled,
  type AlbionRegion,
} from "@/lib/albion/types";

const ENTITY_PATH_RE =
  /^\/(kill|battle|player|guild|alliance)\/([a-z]+)\/([^/?#]+)\/?$/i;

const ALBION_KILLBOARD_RE =
  /albiononline\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?killboard\/kill\/(\d+)/i;

export type DeepLinkResult = {
  path: string;
  label: string;
};

function stripOrigin(input: string, siteOrigin?: string): string {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    if (siteOrigin) {
      const origin = new URL(siteOrigin).origin;
      if (url.origin === origin) {
        return `${url.pathname}${url.search}`;
      }
    }
    // Relative path extracted from any absolute URL for our entity pattern
    return `${url.pathname}${url.search}`;
  } catch {
    return trimmed;
  }
}

/**
 * Parse pasted text into an internal AOTracker path, or null for name search.
 */
export function parseDeepLink(
  input: string,
  preferredRegion: AlbionRegion,
  siteOrigin?: string
): DeepLinkResult | null {
  const raw = input.trim();
  if (!raw) return null;

  const albionKill = raw.match(ALBION_KILLBOARD_RE);
  if (albionKill) {
    const eventId = albionKill[1];
    const region = isRegionEnabled(preferredRegion)
      ? preferredRegion
      : ENABLED_REGIONS[0] ?? "americas";
    return {
      path: `/kill/${region}/${eventId}`,
      label: `Kill #${eventId}`,
    };
  }

  const pathPart = stripOrigin(raw, siteOrigin).split("?")[0] ?? "";
  const normalized = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const match = normalized.match(ENTITY_PATH_RE);
  if (!match) return null;

  const [, type, region, id] = match;
  const entityType = type.toLowerCase();
  if (!isRegionEnabled(region)) return null;

  const decodedId = decodeURIComponent(id);
  if (!decodedId) return null;

  if (
    (entityType === "kill" || entityType === "battle") &&
    !/^\d+$/.test(decodedId)
  ) {
    return null;
  }

  return {
    path: `/${entityType}/${region}/${decodedId}`,
    label: `${entityType} ${decodedId}`,
  };
}
