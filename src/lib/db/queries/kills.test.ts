import { describe, expect, it } from "vitest";
import type { AlbionEvent } from "@/lib/albion/types";
import { mapKillEventToCard } from "@/lib/albion/kill-card-map";
import { combinedVictimEstSilver, assistCountFromParticipants } from "@/lib/albion/player-history";

const occurredAt = new Date("2026-08-01T12:00:00.000Z");

function baseEvent() {
  return {
    eventId: 1,
    region: "americas" as const,
    occurredAt,
    contentType: "SOLO",
    totalVictimKillFame: 1000,
    killer: { albionId: "k1", name: "Killer" },
    victim: { albionId: "v1", name: "Victim" },
  };
}

describe("mapKillEventToCard", () => {
  it("uses denormalized kill-time guilds when payload is not loaded", () => {
    const card = mapKillEventToCard({
      ...baseEvent(),
      killerGuildName: "Killers",
      killerGuildAlbionId: "kg",
      victimGuildName: "Victims",
      victimGuildAlbionId: "vg",
    });

    expect(card.killer?.guild).toEqual({ name: "Killers", albionId: "kg" });
    expect(card.victim?.guild).toEqual({ name: "Victims", albionId: "vg" });
    expect(card.killer?.allianceTag).toBeNull();
    expect(card.victim?.allianceTag).toBeNull();
  });

  it("falls back to participant guild names for compacted rows without event columns", () => {
    const card = mapKillEventToCard({
      ...baseEvent(),
      participants: [
        { role: "killer", guildName: "OldKillers", averageItemPower: "1200" },
        { role: "victim", guildName: "OldVictims", averageItemPower: "1100" },
      ],
    });

    expect(card.killer?.guild).toEqual({ name: "OldKillers" });
    expect(card.victim?.guild).toEqual({ name: "OldVictims" });
  });

  it("does not show a guild when none was stored at kill time", () => {
    const card = mapKillEventToCard(baseEvent());
    expect(card.killer?.guild).toBeNull();
    expect(card.victim?.guild).toBeNull();
    expect(card.lootEstSilver).toBeNull();
    expect(card.gearEstSilver).toBeNull();
    expect(card.participantCount).toBeNull();
  });

  it("prefers payload guilds over stored columns", () => {
    const payload: AlbionEvent = {
      EventId: 1,
      TimeStamp: occurredAt.toISOString(),
      Killer: {
        Id: "k1",
        Name: "Killer",
        GuildId: "kg-payload",
        GuildName: "PayloadKillers",
        AllianceTag: "PK",
      },
      Victim: {
        Id: "v1",
        Name: "Victim",
        GuildId: "vg-payload",
        GuildName: "PayloadVictims",
        AllianceTag: "PV",
      },
    };

    const card = mapKillEventToCard({
      ...baseEvent(),
      killerGuildName: "StaleKillers",
      victimGuildName: "StaleVictims",
      rawPayload: payload,
      participants: [
        { role: "killer", guildName: "PartKillers", averageItemPower: "1" },
        { role: "victim", guildName: "PartVictims", averageItemPower: "1" },
      ],
    });

    expect(card.killer?.guild).toEqual({
      name: "PayloadKillers",
      albionId: "kg-payload",
    });
    expect(card.victim?.guild).toEqual({
      name: "PayloadVictims",
      albionId: "vg-payload",
    });
    expect(card.killer?.allianceTag).toBe("PK");
    expect(card.victim?.allianceTag).toBe("PV");
  });

  it("passes through stored victim gear and loot silver", () => {
    const card = mapKillEventToCard({
      ...baseEvent(),
      lootEstSilver: 320_000,
      gearEstSilver: 1_800_000,
    });

    expect(card.lootEstSilver).toBe(320_000);
    expect(card.gearEstSilver).toBe(1_800_000);
  });

  it("passes through stored participant count", () => {
    const card = mapKillEventToCard({
      ...baseEvent(),
      participantCount: 4,
    });
    expect(card.participantCount).toBe(4);
  });

  it("ignores payload after detail eviction and uses stored kill-time guilds", () => {
    const payload: AlbionEvent = {
      EventId: 1,
      TimeStamp: occurredAt.toISOString(),
      Killer: {
        Id: "k1",
        Name: "Killer",
        GuildName: "ShouldNotShow",
      },
      Victim: {
        Id: "v1",
        Name: "Victim",
        GuildName: "ShouldNotShowEither",
      },
    };

    const card = mapKillEventToCard({
      ...baseEvent(),
      detailEvictedAt: new Date("2026-08-10T00:00:00.000Z"),
      killerGuildName: "KeptKillers",
      killerGuildAlbionId: "kg",
      victimGuildName: "KeptVictims",
      victimGuildAlbionId: "vg",
      rawPayload: payload,
    });

    expect(card.killer?.guild).toEqual({ name: "KeptKillers", albionId: "kg" });
    expect(card.victim?.guild).toEqual({ name: "KeptVictims", albionId: "vg" });
  });
});

describe("combinedVictimEstSilver", () => {
  it("sums gear and loot when both are present", () => {
    expect(combinedVictimEstSilver(1_800_000, 320_000)).toBe(2_120_000);
  });

  it("returns the non-zero side when the other is missing", () => {
    expect(combinedVictimEstSilver(1_800_000, null)).toBe(1_800_000);
    expect(combinedVictimEstSilver(undefined, 320_000)).toBe(320_000);
  });

  it("returns null when both are missing or zero", () => {
    expect(combinedVictimEstSilver(null, null)).toBeNull();
    expect(combinedVictimEstSilver(0, 0)).toBeNull();
    expect(combinedVictimEstSilver(-1, 0)).toBeNull();
  });
});

describe("assistCountFromParticipants", () => {
  it("treats Albion participant count as including the killer", () => {
    expect(assistCountFromParticipants(4)).toBe(3);
    expect(assistCountFromParticipants(2)).toBe(1);
  });

  it("hides 1v1s and missing counts", () => {
    expect(assistCountFromParticipants(1)).toBeNull();
    expect(assistCountFromParticipants(0)).toBeNull();
    expect(assistCountFromParticipants(null)).toBeNull();
  });
});
