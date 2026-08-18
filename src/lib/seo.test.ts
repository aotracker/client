import { describe, expect, it } from "vitest";
import { openGraphImagePath } from "./seo";

describe("openGraphImagePath", () => {
  it("appends /opengraph-image to a path", () => {
    expect(openGraphImagePath("/leaderboards")).toBe(
      "/leaderboards/opengraph-image"
    );
  });

  it("strips query strings so tab canonicals still hit the page image", () => {
    expect(openGraphImagePath("/leaderboards?tab=guilds")).toBe(
      "/leaderboards/opengraph-image"
    );
    expect(openGraphImagePath("/es/leaderboards?tab=fame")).toBe(
      "/es/leaderboards/opengraph-image"
    );
  });
});
