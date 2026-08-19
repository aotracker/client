import { describe, expect, it } from "vitest";
import type { AlbionEvent } from "@/lib/albion/types";
import { mapKillEventToCard } from "@/lib/albion/kill-card-map";

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
