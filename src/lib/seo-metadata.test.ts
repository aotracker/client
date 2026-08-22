import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next-intl/server", () => ({
  getLocale: async () => "es",
  getTranslations: async ({
    locale,
    namespace,
  }: {
    locale: string;
    namespace: string;
  }) => {
    const t = (key: string, values?: Record<string, string>) => {
      if (namespace === "Seo" && key === "pendingTitle") {
        return `${values?.entity} not loaded yet`;
      }
      if (namespace === "Seo" && key === "pendingDescription") {
        return `This ${values?.entity} is still being fetched from Albion Online.`;
      }
      if (namespace === "Seo" && key.startsWith("kinds.")) {
        return key.slice("kinds.".length);
      }
      return key;
    };
    t.has = () => true;
    return t;
  },
}));

import { pendingEntityMetadata } from "./seo-metadata";

describe("pendingEntityMetadata", () => {
  it("canonicalizes to the active locale", async () => {
    const metadata = await pendingEntityMetadata(
      "player",
      "/player/americas/Name",
      "es"
    );

    expect(metadata.alternates?.canonical).toMatch(
      /\/es\/player\/americas\/Name$/
    );
    expect(metadata.title).toBe("player not loaded yet");
  });
});
