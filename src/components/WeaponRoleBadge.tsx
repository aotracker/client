"use client";

import type { LucideIcon } from "lucide-react";
import { Heart, Shield, Sparkles, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import type { WeaponRole } from "@/lib/items/weapon-roles";
import { cn } from "@/lib/utils";

const ROLE_CLASS: Record<WeaponRole, string> = {
  healer: "border-green-500/40 bg-green-500/15 text-green-700 dark:text-green-300",
  tank: "border-blue-500/40 bg-blue-500/15 text-blue-700 dark:text-blue-300",
  support: "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300",
  dps: "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300",
};

const ROLE_ICON: Record<WeaponRole, LucideIcon> = {
  tank: Shield,
  dps: Swords,
  healer: Heart,
  support: Sparkles,
};

const ROLE_LABEL: Record<WeaponRole, string> = {
  healer: "Healer",
  tank: "Tank",
  support: "Support",
  dps: "DPS",
};

export function WeaponRoleBadge({
  role,
  className,
}: {
  role?: WeaponRole | null;
  className?: string;
}) {
  if (!role) return null;

  const label = ROLE_LABEL[role];
  const Icon = ROLE_ICON[role];

  return (
    <Tooltip
      content={`Role from main-hand weapon tree: ${label}`}
      side="bottom"
      align="start"
    >
      <Badge
        size="sm"
        variant="outline"
        className={cn("gap-0.5 pl-0.5 pr-1", ROLE_CLASS[role], className)}
      >
        <Icon className="size-2.5 shrink-0" aria-hidden />
        {label}
      </Badge>
    </Tooltip>
  );
}
