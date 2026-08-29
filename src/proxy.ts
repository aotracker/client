import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { stripLocalePrefix, localePathPrefix, isAppLocale } from "@/i18n/locales";
import {
  FEED_PATHS,
  resolveRegionAliasRedirect,
  type FeedPath,
} from "@/lib/region-params";
import { parsePreferredRegionCookieHeader } from "@/lib/region-preference";

const intlMiddleware = createMiddleware(routing);

function isFeedPath(pathname: string): pathname is FeedPath {
  return (FEED_PATHS as readonly string[]).includes(pathname);
}

function redirectToCanonicalFeed(
  request: NextRequest,
  destination: string
): NextResponse {
  const url = new URL(destination, request.url);
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "region") {
      url.searchParams.set(key, value);
    }
  });
  return NextResponse.redirect(url);
}

/** Re-apply locale prefix to a locale-stripped destination path + query. */
function withRequestLocale(request: NextRequest, destination: string): string {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/");
  const maybeLocale = segments[1];
  const localePrefix =
    maybeLocale && isAppLocale(maybeLocale) ? localePathPrefix(maybeLocale) : "";

  if (!localePrefix) return destination;

  const qIndex = destination.indexOf("?");
  const path = qIndex >= 0 ? destination.slice(0, qIndex) : destination;
  const query = qIndex >= 0 ? destination.slice(qIndex) : "";
  if (path === "/") return `${localePrefix}${query}`;
  return `${localePrefix}${path}${query}`;
}

export default function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // File-based metadata at the app root must not be locale-prefixed.
  if (pathname === "/icon" || pathname === "/apple-icon") {
    return NextResponse.next();
  }

  const stripped = stripLocalePrefix(pathname);

  const aliasDestination = resolveRegionAliasRedirect(stripped);
  if (aliasDestination) {
    return redirectToCanonicalFeed(
      request,
      withRequestLocale(request, aliasDestination)
    );
  }

  if (isFeedPath(stripped) && !searchParams.has("region")) {
    const preferred = parsePreferredRegionCookieHeader(
      request.headers.get("cookie")
    );
    if (preferred) {
      const url = request.nextUrl.clone();
      // Keep locale in the path; only add region query.
      url.searchParams.set("region", preferred);
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames except api, next internals, vercel, and files with dots
    "/((?!api|_next|_vercel|admin|sitemap\\.xml|sitemaps|robots\\.txt|.*\\..*).*)",
    // Player/guild names may contain dots
    "/([\\w-]+)?/player/(.+)",
    "/([\\w-]+)?/guild/(.+)",
    "/([\\w-]+)?/alliance/(.+)",
    "/([\\w-]+)?/feud/(.+)",
  ],
};
