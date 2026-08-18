import { describe, expect, it } from "vitest";
import {
  LEADERBOARD_TABS,
  leaderboardCanonicalPath,
  parseLeaderboardTab,
} from "./params";

describe("leaderboardCanonicalPath", () => {
  it("omits the default killers tab from the canonical", () => {
    expect(leaderboardCanonicalPath("killers")).toBe("/leaderboards");
  });

  it("uses a tab query for every other leaderboard", () => {
    expect(leaderboardCanonicalPath("guilds")).toBe("/leaderboards?tab=guilds");
    expect(leaderboardCanonicalPath("alliances")).toBe(
      "/leaderboards?tab=alliances"
    );
    expect(leaderboardCanonicalPath("kills")).toBe("/leaderboards?tab=kills");
    expect(leaderboardCanonicalPath("fame")).toBe("/leaderboards?tab=fame");
  });

  it("covers every tab", () => {
    for (const tab of LEADERBOARD_TABS) {
      expect(leaderboardCanonicalPath(tab)).toMatch(/^\/leaderboards/);
    }
  });
});

describe("parseLeaderboardTab", () => {
  it("falls back to killers so invalid tabs canonicalise to /leaderboards", () => {
    expect(parseLeaderboardTab("bogus")).toBe("killers");
    expect(leaderboardCanonicalPath(parseLeaderboardTab("killers"))).toBe(
      "/leaderboards"
    );
  });
});
