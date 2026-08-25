import { describe, expect, it } from "vitest";
import {
  displayableAccountEmail,
  isSyntheticDiscordEmail,
} from "./auth-email";

describe("isSyntheticDiscordEmail", () => {
  it("treats empty as synthetic", () => {
    expect(isSyntheticDiscordEmail(null)).toBe(true);
    expect(isSyntheticDiscordEmail("")).toBe(true);
  });

  it("detects the Discord placeholder domain", () => {
    expect(
      isSyntheticDiscordEmail("discord_1234567890@users.discord.local")
    ).toBe(true);
    expect(
      isSyntheticDiscordEmail("Discord_1@Users.Discord.Local")
    ).toBe(true);
  });

  it("leaves real addresses alone", () => {
    expect(isSyntheticDiscordEmail("player@gmail.com")).toBe(false);
  });
});

describe("displayableAccountEmail", () => {
  it("hides email unless Google is linked", () => {
    expect(
      displayableAccountEmail("player@gmail.com", ["discord"])
    ).toBeNull();
  });

  it("hides Discord placeholders even when Google is linked", () => {
    expect(
      displayableAccountEmail("discord_1@users.discord.local", [
        "discord",
        "google",
      ])
    ).toBeNull();
  });

  it("shows a real Google email", () => {
    expect(displayableAccountEmail("player@gmail.com", ["google"])).toBe(
      "player@gmail.com"
    );
  });
});
