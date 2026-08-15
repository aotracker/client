export const DISCORD_INVITE_PERMISSIONS = "2147601408";

export function discordInviteUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: DISCORD_INVITE_PERMISSIONS,
    integration_type: "0",
    scope: "bot applications.commands",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
