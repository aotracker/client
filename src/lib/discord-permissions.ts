export const DISCORD_PERMISSION_ADMINISTRATOR = BigInt(8);
export const DISCORD_PERMISSION_MANAGE_GUILD = BigInt(32);

/** Same gate as slash `hasManageGuild`: owner, Administrator, or Manage Server. */
export function canManageDiscordGuild(input: {
  owner?: boolean | null;
  permissions?: string | number | bigint | null;
}): boolean {
  if (input.owner) return true;
  try {
    const bits = BigInt(input.permissions ?? 0);
    return (
      (bits & DISCORD_PERMISSION_ADMINISTRATOR) ===
        DISCORD_PERMISSION_ADMINISTRATOR ||
      (bits & DISCORD_PERMISSION_MANAGE_GUILD) ===
        DISCORD_PERMISSION_MANAGE_GUILD
    );
  } catch {
    return false;
  }
}
