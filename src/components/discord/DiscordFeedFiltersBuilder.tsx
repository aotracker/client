"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const CONTENT_OPTIONS = ["SOLO", "GROUP", "ZVZ"] as const;

export function DiscordFeedFiltersBuilder() {
  const t = useTranslations("Discord.filters");
  const [minFame, setMinFame] = useState("0");
  const [minSilver, setMinSilver] = useState("0");
  const [content, setContent] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
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
    return parts.join(" ");
  }, [content, minFame, minSilver, paused]);

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
    <div className="space-y-4 rounded-lg border border-border bg-card/40 px-4 py-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("minFame")}
          </span>
          <input
            type="number"
            min={0}
            value={minFame}
            onChange={(event) => setMinFame(event.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("minSilver")}
          </span>
          <input
            type="number"
            min={0}
            value={minSilver}
            onChange={(event) => setMinSilver(event.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("content")}
        </p>
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
          checked={paused}
          onChange={(event) => setPaused(event.target.checked)}
        />
        {t("paused")}
      </label>

      <div className="space-y-2">
        <code className="block overflow-x-auto rounded-md bg-muted px-2.5 py-1.5 font-mono text-[13px] text-foreground">
          {command}
        </code>
        <Button type="button" size="sm" variant="outline" onClick={copyCommand}>
          {copied ? t("copied") : t("copy")}
        </Button>
      </div>
    </div>
  );
}
