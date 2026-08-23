/** Public flags for which social login buttons to show (client-safe). */

export function isDiscordLoginVisible(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID?.trim());
}

export function isGoogleLoginVisible(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim());
}

export function isSocialLoginVisible(): boolean {
  return isDiscordLoginVisible() || isGoogleLoginVisible();
}

export type SocialAuthProvider = "discord" | "google";

export function visibleSocialProviders(): SocialAuthProvider[] {
  const providers: SocialAuthProvider[] = [];
  if (isDiscordLoginVisible()) providers.push("discord");
  if (isGoogleLoginVisible()) providers.push("google");
  return providers;
}
