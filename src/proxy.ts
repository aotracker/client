import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  FEED_PATHS,
  resolveRegionAliasRedirect,
  type FeedPath,
} from "@/lib/region-params";
import { parsePreferredRegionCookieHeader } from "@/lib/region-preference";

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

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const aliasDestination = resolveRegionAliasRedirect(pathname);
  if (aliasDestination) {
    return redirectToCanonicalFeed(request, aliasDestination);
  }

  if (!isFeedPath(pathname) || searchParams.has("region")) {
    return NextResponse.next();
  }

  const preferred = parsePreferredRegionCookieHeader(
    request.headers.get("cookie")
  );
  if (!preferred) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.searchParams.set("region", preferred);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/",
    "/battles",
    "/leaderboards",
    "/builds",
    "/:region(americas|europe|asia)",
    "/:region(americas|europe|asia)/:feed(battles|leaderboards|builds)",
  ],
};
