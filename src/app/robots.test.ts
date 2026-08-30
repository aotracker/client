import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("blocks kill details in every locale without blocking the kills feed", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = rules?.disallow;

    expect(disallow).toEqual(expect.arrayContaining(["/kill/", "/es/kill/"]));
    expect(disallow).not.toContain("/kill");
    expect(disallow).not.toContain("/kills");
    expect(disallow).not.toContain("/es/kills");
  });
});
