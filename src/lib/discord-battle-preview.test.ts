import { describe, expect, it } from "vitest";
import {
  battlePreviewOgInput,
  buildBattlePreviewMessageBody,
} from "./discord-battle-preview";

describe("buildBattlePreviewMessageBody", () => {
  it("builds a recap embed without a text scoreboard", () => {
    const body = buildBattlePreviewMessageBody({
      region: "americas",
      trackedGuildName: "Elevate",
    });
    const embed = body.embeds[0]!;
    expect(embed.title).toBe("Elevate battle recap");
    expect(embed.description).toContain("Preview");
    expect(embed.footer?.text).toContain("preview");
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
