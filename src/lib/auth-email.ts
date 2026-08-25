/** Discord OAuth does not request email; Better Auth still stores a placeholder. */
const DISCORD_LOCAL_EMAIL_SUFFIX = "@users.discord.local";

export function isSyntheticDiscordEmail(
  email: string | null | undefined
): boolean {
  if (!email) return true;
  return email.trim().toLowerCase().endsWith(DISCORD_LOCAL_EMAIL_SUFFIX);
}

/**
 * Email shown on Account settings. Discord placeholders stay hidden.
 * Google-first accounts keep their real address; Discord-first + linked Google
 * still has the placeholder on `user.email`, so nothing is shown then.
 */
export function displayableAccountEmail(
  email: string | null | undefined,
  providers: readonly string[]
): string | null {
  if (!providers.includes("google")) return null;
  if (!email || isSyntheticDiscordEmail(email)) return null;
  const trimmed = email.trim();
  return trimmed.length > 0 ? trimmed : null;
}
