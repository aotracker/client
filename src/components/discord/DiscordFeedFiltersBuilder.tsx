"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

const CONTENT_OPTIONS = ["SOLO", "GROUP", "ZVZ"] as const;

export function DiscordFeedFiltersBuilder() {
  const t = useTranslations("Discord.filters");
  const [minFame, setMinFame] = useState("0");
  const [minSilver, setMinSilver] = useState("0");
  const [content, setContent] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [minPlayers, setMinPlayers] = useState("20");
  const [createThread, setCreateThread] = useState(false);
  const [feed, setFeed] = useState<"both" | "kills" | "deaths" | "battles">("both");
  const [copied, setCopied] = useState(false);

  const command = useMemo(() => {
    const parts = ["/feed-filters"];
    const fame = Number(minFame);
    if (Number.isFinite(fame) && fame > 0) {
      parts.push(`min-fame:${Math.floor(fame)}`);
    } else {
      parts.push("min-fame:0");
    }
    const silver = Number(minSilver);
    if (Number.isFinite(silver) && silver > 0) {
      parts.push(`min-silver:${Math.floor(silver)}`);
    }
    if (content.length > 0) {
      parts.push(`content:${content.join(",")}`);
    } else {
      parts.push("content:all");
    }
    parts.push(`paused:${paused ? "true" : "false"}`);
    const players = Number(minPlayers);
    if (Number.isFinite(players) && players > 0) {
      parts.push(`min-players:${Math.floor(players)}`);
    }
    parts.push(`create-thread:${createThread ? "true" : "false"}`);
    if (feed !== "both") parts.push(`feed:${feed}`);
    return parts.join(" ");
  }, [content, createThread, feed, minFame, minPlayers, minSilver, paused]);

  function toggleContent(value: string) {
    setContent((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">{t("title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-label">{t("minFame")}</span>
          <Input
            type="number"
            min={0}
            value={minFame}
            onChange={(event) => setMinFame(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-label">{t("minSilver")}</span>
          <Input
            type="number"
            min={0}
            value={minSilver}
            onChange={(event) => setMinSilver(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-label">{t("minPlayers")}</span>
          <Input
            type="number"
            min={1}
            value={minPlayers}
            onChange={(event) => setMinPlayers(event.target.value)}
          />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-label">{t("content")}</p>
        <div className="flex flex-wrap gap-2">
          {CONTENT_OPTIONS.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={content.includes(value) ? "default" : "outline"}
              onClick={() => toggleContent(value)}
            >
              {value}
            </Button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={createThread}
          onChange={(event) => setCreateThread(event.target.checked)}
        />
        {t("createThread")}
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={paused}
          onChange={(event) => setPaused(event.target.checked)}
        />
        {t("paused")}
      </label>

      <label className="space-y-1 text-sm">
        <span className="text-label">{t("feed")}</span>
        <Select
          className="max-w-xs"
          value={feed}
          onChange={(event) =>
            setFeed(event.target.value as "both" | "kills" | "deaths" | "battles")
          }
        >
          <option value="both">{t("feedBoth")}</option>
          <option value="kills">{t("feedKills")}</option>
          <option value="deaths">{t("feedDeaths")}</option>
          <option value="battles">{t("feedBattles")}</option>
        </Select>
      </label>

      <div className="space-y-2">
        <code className="block overflow-x-auto rounded-md bg-muted px-3 py-1.5 font-mono text-sm text-foreground">
          {command}
        </code>
        <Button type="button" size="sm" variant="outline" onClick={copyCommand}>
          {copied ? t("copied") : t("copy")}
        </Button>
      </div>
      </CardContent>
    </Card>
  );
}
