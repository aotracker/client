import type { LucideIcon } from "lucide-react";
import { Swords, User, Users } from "lucide-react";
import {
  CONTENT_TYPE_LABELS,
  type ContentType,
} from "@/lib/albion/types";
import { Badge } from "@/components/ui/badge";

const variants: Record<ContentType, "zvz" | "solo" | "group"> = {
  ZVZ: "zvz",
  SOLO: "solo",
  GROUP: "group",
};

const ICONS: Record<ContentType, LucideIcon> = {
  SOLO: User,
  GROUP: Users,
  ZVZ: Swords,
};

function normalizeContentType(type: string): ContentType {
  if (type in CONTENT_TYPE_LABELS) return type as ContentType;
  return "GROUP";
}

export function ContentBadge({ type }: { type: ContentType | string }) {
  const t = normalizeContentType(type);
  const Icon = ICONS[t];
  return (
    <Badge size="sm" variant={variants[t]} className="gap-0.5 pl-0.5 pr-1.5">
      <Icon className="size-2.5 shrink-0" aria-hidden />
      {CONTENT_TYPE_LABELS[t]}
    </Badge>
  );
}
