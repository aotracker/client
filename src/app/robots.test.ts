import { describe, expect, it } from "vitest";
import robots from "./robots";

function ruleList(result: ReturnType<typeof robots>) {
  return Array.isArray(result.rules) ? result.rules : [result.rules];
}

describe("robots", () => {
  it("blocks kill details in every locale without blocking the kills feed", () => {
    const wildcard = ruleList(robots()).find((rule) => rule.userAgent === "*");
    const disallow = wildcard?.disallow;

    expect(disallow).toEqual(expect.arrayContaining(["/kill/", "/es/kill/"]));
    expect(disallow).not.toContain("/kill");
    expect(disallow).not.toContain("/kills");
    expect(disallow).not.toContain("/es/kills");
  });

  it("blocks AhrefsBot from the entire site", () => {
    const ahrefs = ruleList(robots()).find(
      (rule) => rule.userAgent === "AhrefsBot"
    );

    expect(ahrefs?.disallow).toEqual("/");
  });
});
