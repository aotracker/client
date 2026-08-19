import { describe, expect, it } from "vitest";
import {
  guildAtKillFromRef,
  resolveGuildAtKill,
} from "./player-history";

describe("guildAtKillFromRef", () => {
  it("returns kill-time guild from the payload ref", () => {
    expect(
      guildAtKillFromRef({
        GuildId: "g1",
        GuildName: "AtKill",
      })
    ).toEqual({ name: "AtKill", albionId: "g1" });
  });

  it("returns null when the player was unguilded", () => {
    expect(guildAtKillFromRef({ Name: "Solo" })).toBeNull();
    expect(guildAtKillFromRef({ GuildName: "   " })).toBeNull();
  });
});

describe("resolveGuildAtKill", () => {
  it("prefers the payload guild over stored columns and participant name", () => {
    expect(
      resolveGuildAtKill(
        { GuildId: "g1", GuildName: "Payload" },
        "Participant",
        { name: "Stored", albionId: "g2" }
      )
    ).toEqual({ name: "Payload", albionId: "g1" });
  });

  it("uses denormalized event columns when payload has no guild", () => {
    expect(
      resolveGuildAtKill(undefined, "Participant", {
        name: "Stored",
        albionId: "g2",
      })
    ).toEqual({ name: "Stored", albionId: "g2" });
  });

  it("uses the participant row when payload and event columns are empty", () => {
    expect(resolveGuildAtKill(undefined, "Participant")).toEqual({
      name: "Participant",
    });
  });

  it("does not invent a guild when nothing was captured at kill time", () => {
    expect(resolveGuildAtKill(undefined, null, null)).toBeNull();
    expect(resolveGuildAtKill({ Name: "NowInAGuild" })).toBeNull();
  });
});
