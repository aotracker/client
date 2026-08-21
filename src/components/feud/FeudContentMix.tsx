import { getTranslations } from "next-intl/server";
import type { PlayerContentMixEntry } from "@/lib/db/queries";

interface FeudContentMixProps {
  contentMix: PlayerContentMixEntry[];
}

export async function FeudContentMix({ contentMix }: FeudContentMixProps) {
  const t = await getTranslations("Feud.contentMix");
  const tFilters = await getTranslations("Filters");

  if (contentMix.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("empty")}</p>
    );
  }

  const labels: Record<string, string> = {
    ZVZ: tFilters("contentZvz"),
    GROUP: tFilters("contentGroup"),
    SOLO: tFilters("contentSolo"),
  };

  const sorted = [...contentMix].sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{t("label")}</span>
      {sorted.map((entry) => (
        <span
          key={entry.contentType}
          className="rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 tabular-nums"
        >
          {labels[entry.contentType] ?? entry.contentType} {entry.count}
        </span>
      ))}
    </div>
  );
}
