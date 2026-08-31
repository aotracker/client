import { describe, expect, it } from "vitest";
import {
  formatTwitchOffset,
  parseTwitchDurationSeconds,
  parseTwitchLogin,
  parseYoutubeChannelInput,
  twitchVodOffsetForKill,
  twitchVodUrl,
  youtubeThumbnailUrl,
  sizedTwitchThumbnail,
} from "./urls";

describe("parseTwitchLogin", () => {
  it("accepts a raw login", () => {
    expect(parseTwitchLogin("Some_Streamer")).toBe("some_streamer");
  });

  it("parses twitch.tv URLs", () => {
    expect(parseTwitchLogin("https://www.twitch.tv/albion")).toBe("albion");
    expect(parseTwitchLogin("twitch.tv/FooBar/")).toBe("foobar");
  });

  it("rejects junk", () => {
    expect(parseTwitchLogin("no")).toBeNull();
    expect(parseTwitchLogin("https://youtube.com/@x")).toBeNull();
  });
});

describe("twitch offsets", () => {
  it("formats and parses durations", () => {
    expect(formatTwitchOffset(3661)).toBe("1h1m1s");
    expect(formatTwitchOffset(90)).toBe("1m30s");
    expect(parseTwitchDurationSeconds("3h2m1s")).toBe(10921);
    expect(parseTwitchDurationSeconds("14m")).toBe(840);
  });

  it("builds VOD urls", () => {
    expect(twitchVodUrl("123", 90)).toBe(
      "https://www.twitch.tv/videos/123?t=1m30s"
    );
  });

  it("builds YouTube thumbnail urls", () => {
    expect(youtubeThumbnailUrl("abcdefghijk")).toBe(
      "https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg"
    );
  });

  it("sizes Twitch thumbnail templates", () => {
    expect(
      sizedTwitchThumbnail(
        "https://static-cdn.jtvnw.net/previews-ttv/live_user_x-{width}x{height}.jpg",
        160,
        90
      )
    ).toBe(
      "https://static-cdn.jtvnw.net/previews-ttv/live_user_x-160x90.jpg"
    );
    expect(
      sizedTwitchThumbnail(
        "https://static-cdn.jtvnw.net/cf_vods/x/thumb/%{width}x%{height}.jpg",
        440,
        248
      )
    ).toBe("https://static-cdn.jtvnw.net/cf_vods/x/thumb/440x248.jpg");
    expect(sizedTwitchThumbnail(null)).toBeNull();
  });

  it("rewinds 30s before the kill and does not go before stream start", () => {
    const started = new Date("2026-08-30T12:00:00.000Z");
    const kill = new Date("2026-08-30T12:02:10.000Z");
    expect(twitchVodOffsetForKill(kill, started)).toBe(100);
    expect(
      twitchVodOffsetForKill(new Date("2026-08-30T12:00:10.000Z"), started)
    ).toBe(0);
  });
});

describe("parseYoutubeChannelInput", () => {
  it("parses ids and handles", () => {
    expect(parseYoutubeChannelInput("UC123456789012345678901")).toEqual({
      kind: "id",
      value: "UC123456789012345678901",
    });
    expect(
      parseYoutubeChannelInput("https://www.youtube.com/@AlbionOnline")
    ).toEqual({ kind: "handle", value: "AlbionOnline" });
  });
});
