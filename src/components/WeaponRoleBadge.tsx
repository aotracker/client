import type { LucideIcon } from "lucide-react";
import { Heart, Shield, Sparkles, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getWeaponRole,
  weaponRoleLabel,
  type WeaponRole,
} from "@/lib/items/weapon-roles";
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

export function WeaponRoleBadge({
  itemType,
  className,
}: {
  itemType: string | null | undefined;
  className?: string;
}) {
  const role = getWeaponRole(itemType);
  if (!role) return null;

  const label = weaponRoleLabel(role);
  const Icon = ROLE_ICON[role];

  return (
    <span title={`Role from main-hand weapon tree: ${label}`}>
      <Badge
        size="sm"
        variant="outline"
        className={cn("gap-0.5 pl-0.5 pr-1", ROLE_CLASS[role], className)}
      >
        <Icon className="size-2.5 shrink-0" aria-hidden />
        {label}
      </Badge>
    </span>
  );
}
