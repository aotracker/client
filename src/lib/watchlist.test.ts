import { describe, expect, it } from "vitest";
import {
  uniqueWatchlistEntries,
  type WatchlistEntry,
} from "./watchlist";

function entry(
  overrides: Partial<WatchlistEntry> & Pick<WatchlistEntry, "addedAt">
): WatchlistEntry {
  return {
    type: "alliance",
    region: "americas",
    albionId: "WDqEy84IS6WyEaI7BqNw8A",
    name: "Watchers",
    ...overrides,
  };
}

describe("uniqueWatchlistEntries", () => {
  it("collapses duplicate (type, region, albionId) rows", () => {
    const unique = uniqueWatchlistEntries([
      entry({ addedAt: "2026-08-23T07:45:05.914Z", name: "Watchers" }),
      entry({ addedAt: "2026-08-23T08:00:00.000Z", name: "Watchers (dup)" }),
    ]);
    expect(unique).toHaveLength(1);
    expect(unique[0]?.name).toBe("Watchers");
  });

  it("keeps the earlier addedAt when merging duplicates", () => {
    const unique = uniqueWatchlistEntries([
      entry({ addedAt: "2026-08-23T08:00:00.000Z", name: "newer" }),
      entry({ addedAt: "2026-08-23T07:00:00.000Z", name: "older" }),
    ]);
    expect(unique[0]?.name).toBe("older");
  });

  it("keeps distinct entities", () => {
    const unique = uniqueWatchlistEntries([
      entry({ addedAt: "2026-08-23T07:00:00.000Z" }),
      entry({
        type: "guild",
        albionId: "other",
        name: "Other",
        addedAt: "2026-08-23T07:00:00.000Z",
      }),
    ]);
    expect(unique).toHaveLength(2);
  });
});
