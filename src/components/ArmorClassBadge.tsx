"use client";

import { Shirt } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  getArmorClass,
  getBuildArmorClass,
  type ArmorClass,
} from "@/lib/items/item-meta";
import { cn } from "@/lib/utils";

const ARMOR_CLASS: Record<ArmorClass, string> = {
  plate: "border-slate-500/40 bg-slate-500/15 text-slate-700 dark:text-slate-300",
  leather:
    "border-amber-600/40 bg-amber-600/15 text-amber-800 dark:text-amber-300",
  cloth: "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

export function ArmorClassBadge({
  itemType,
  items,
  className,
}: {
  itemType?: string | null;
  items?: { slot?: string | null; itemType: string }[];
  className?: string;
}) {
  const t = useTranslations("Common.labels.armorClasses");
  const armorClass = items
    ? getBuildArmorClass(items)
    : getArmorClass(itemType);
  if (!armorClass) return null;

  const label = t(armorClass);

  return (
    <span title={label}>
      <Badge
        size="sm"
        variant="outline"
        className={cn("gap-0.5 pl-0.5 pr-1", ARMOR_CLASS[armorClass], className)}
      >
        <Shirt className="size-2.5 shrink-0" aria-hidden />
        {label}
      </Badge>
    </span>
  );
}
