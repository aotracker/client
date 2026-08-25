import { describe, expect, it } from "vitest";
import {
  DISCORD_PERMISSION_ADMINISTRATOR,
  DISCORD_PERMISSION_MANAGE_GUILD,
  canManageDiscordGuild,
} from "./discord-permissions";

describe("canManageDiscordGuild", () => {
  it("allows the server owner", () => {
    expect(canManageDiscordGuild({ owner: true, permissions: "0" })).toBe(true);
  });

  it("allows Administrator or Manage Server bits", () => {
    expect(
      canManageDiscordGuild({
        permissions: String(DISCORD_PERMISSION_ADMINISTRATOR),
      })
    ).toBe(true);
    expect(
      canManageDiscordGuild({
        permissions: String(DISCORD_PERMISSION_MANAGE_GUILD),
      })
    ).toBe(true);
  });

  it("rejects members without those bits", () => {
    expect(canManageDiscordGuild({ permissions: "0" })).toBe(false);
    expect(canManageDiscordGuild({ permissions: "1024" })).toBe(false);
  });
});
