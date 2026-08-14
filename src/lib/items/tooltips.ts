import { formatItemTooltip } from "@/lib/items/catalog";
import { formatSilver } from "@/lib/utils";

export function formatKillItemTooltip({
  itemType,
  locale,
  estSilver,
  estValueLabel,
}: {
  itemType: string;
  locale?: string | null;
  estSilver?: number | null;
  estValueLabel?: (value: string) => string;
}): string {
  const lines = [formatItemTooltip(itemType, locale)];
  if (estSilver != null && estSilver > 0 && estValueLabel) {
    lines.push(estValueLabel(formatSilver(estSilver)));
  }
  return lines.join("\n");
}
