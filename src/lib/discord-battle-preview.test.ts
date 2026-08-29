import { describe, expect, it } from "vitest";
import {
  battlePreviewOgInput,
  buildBattlePreviewMessageBody,
} from "./discord-battle-preview";

describe("buildBattlePreviewMessageBody", () => {
  it("builds a recap embed with only a linked header", () => {
    const body = buildBattlePreviewMessageBody({
      region: "americas",
      trackedGuildName: "Elevate",
    });
    const embed = body.embeds[0]!;
    expect(embed.title).toBe("Elevate battle recap");
    expect(embed.url).toContain("/battle/americas/99");
    expect(embed).not.toHaveProperty("description");
    expect(embed).not.toHaveProperty("footer");
    const button = body.components[0]?.components[0];
    expect(button?.label).toBe("View Battle on AOTracker");
    expect(button?.url).toBe(embed.url);
    expect(button?.url).toContain("/battle/americas/99");
  });
});

describe("battlePreviewOgInput", () => {
  it("highlights the tracked guild in the sample table", () => {
    const og = battlePreviewOgInput({
      region: "europe",
      trackedGuildName: "Elevate",
    });
    expect(og.mode).toBe("guilds");
    expect(og.highlightName).toBe("Elevate");
    expect(og.badge).toBe("Preview");
    expect(og.rows[0]?.name).toBe("Elevate");
    expect(og.rows).toHaveLength(4);
  });
});
