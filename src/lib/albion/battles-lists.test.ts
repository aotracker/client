import { describe, expect, it } from "vitest";
import type { AlbionBattle, AlbionBattlePlayer } from "./types";
import {
  countGuildMembersInBattle,
  isMultiMemberGuildBattle,
  toAllianceBattleSummary,
  toGuildBattleSummary,
} from "./battles";

const GUILD_ID = "g1";
const ALLIANCE_ID = "a1";

function player(
  id: string,
  extras: Partial<AlbionBattlePlayer> = {}
): AlbionBattlePlayer {
  return {
    id,
    name: id,
    kills: 0,
    deaths: 0,
    killFame: 0,
    ...extras,
  };
}

function battle(overrides: Partial<AlbionBattle> = {}): AlbionBattle {
  return {
    id: 1,
    totalFame: 100_000,
    totalKills: 8,
    totalPlayers: 20,
    ...overrides,
  };
}

describe("guild/alliance profile battle floor", () => {
  it("counts listed guild players when the player map is empty", () => {
    expect(
      countGuildMembersInBattle(
        battle({
          guilds: {
            [GUILD_ID]: {
              id: GUILD_ID,
              name: "Elevate",
              kills: 4,
              deaths: 2,
              killFame: 80_000,
              players: 7,
            },
          },
        }),
        GUILD_ID
      )
    ).toBe(7);
  });

  it("drops fights with fewer than 2 entity members", () => {
    expect(isMultiMemberGuildBattle({ guildMembers: 1 })).toBe(false);
    expect(isMultiMemberGuildBattle({ guildMembers: 2 })).toBe(true);
    expect(
      toGuildBattleSummary(
        battle({
          players: { a: player("a", { guildId: GUILD_ID }) },
        }),
        GUILD_ID
      ).guildMembers
    ).toBe(1);
    expect(
      toAllianceBattleSummary(
        battle({
          alliances: {
            [ALLIANCE_ID]: {
              id: ALLIANCE_ID,
              name: "POE",
              kills: 1,
              deaths: 1,
              killFame: 5_000,
              players: 1,
            },
          },
        }),
        ALLIANCE_ID
      ).guildMembers
    ).toBe(1);
  });
});
