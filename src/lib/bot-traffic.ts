/** When true, skip ingest enqueue for high-confidence kill URL scrapers. */
export function shouldSkipScannerKillIngest(): boolean {
  return process.env.KILL_MISS_SKIP_SCANNER_INGEST === "true";
}

/**
 * Heuristic for automated kill/feud URL spray (spoofed Chrome, no session).
 * Direct shares from real users may lack Referer; never use Referer alone as a block signal.
 */
export function isLikelyKillUrlScraper(headerLike: Headers | {
  get(name: string): string | null;
}): boolean {
  const ua = headerLike.get("user-agent") ?? "";
  if (
    /Googlebot|bingbot|Discordbot|Twitterbot|facebookexternalhit|LinkedInBot|Slackbot|WhatsApp|TelegramBot/i.test(
      ua
    )
  ) {
    return false;
  }

  if (headerLike.get("sec-fetch-user") === "?1") {
    return false;
  }

  const cookie = headerLike.get("cookie") ?? "";
  if (
    cookie.includes("better-auth.session_token") ||
    cookie.includes("session_token")
  ) {
    return false;
  }

  let score = 0;
  const accept = headerLike.get("accept") ?? "";
  if (!accept || accept.trim() === "*/*") {
    score += 1;
  }

  if (/Chrome\/1[4-9]\d/.test(ua) || /Edg\/1[4-9]\d/.test(ua)) {
    score += 1;
  }

  const secFetchSite = headerLike.get("sec-fetch-site");
  if (secFetchSite === "none" && !cookie) {
    score += 1;
  }

  return score >= 2;
}

export function logLikelyKillScraper(context: {
  region: string;
  eventId: number;
  skipIngest: boolean;
}): void {
  console.warn(
    "[kill-miss] likely scanner",
    JSON.stringify({
      region: context.region,
      eventId: context.eventId,
      skipIngest: context.skipIngest,
    })
  );
}
