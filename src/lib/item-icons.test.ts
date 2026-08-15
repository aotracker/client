import { afterEach, describe, expect, it, vi } from "vitest";
import { itemIconLocalPath, itemIconRemoteUrl } from "./item-icons";

describe("item icon URLs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds a local /item-icons path without CDN", () => {
    expect(itemIconLocalPath("T8_MAIN_SWORD", 4)).toBe(
      "/item-icons/T8_MAIN_SWORD_q4.png"
    );
  });

  it("builds the Albion render URL", () => {
    expect(itemIconRemoteUrl("T8_MAIN_SWORD@1", 4)).toContain(
      "render.albiononline.com/v1/item/T8_MAIN_SWORD%401.png"
    );
  });
});
