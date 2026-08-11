/**
 * User-agent substrings for services that fetch Open Graph / Twitter Card metadata.
 * Used in docs and deploy scripts; keep in sync with deploy/cloudflare/README.md.
 */
export const SOCIAL_CRAWLER_USER_AGENT_MARKERS = [
  "Discordbot",
  "Twitterbot",
  "facebookexternalhit",
  "LinkedInBot",
  "Slackbot",
  "WhatsApp",
  "TelegramBot",
  "Embedly",
  "Pinterest",
] as const;

const SOCIAL_CRAWLER_PATTERN = new RegExp(
  SOCIAL_CRAWLER_USER_AGENT_MARKERS.join("|"),
  "i"
);

export function isSocialCrawlerUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return SOCIAL_CRAWLER_PATTERN.test(userAgent);
}
