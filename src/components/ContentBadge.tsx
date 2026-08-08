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

function normalizeContentType(type: string): ContentType {
  if (type in CONTENT_TYPE_LABELS) return type as ContentType;
  return "GROUP";
}

export function ContentBadge({ type }: { type: ContentType | string }) {
  const t = normalizeContentType(type);
  return <Badge size="sm" variant={variants[t]}>{CONTENT_TYPE_LABELS[t]}</Badge>;
}
