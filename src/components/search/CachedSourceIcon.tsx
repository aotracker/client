import { Database } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

export function CachedSourceIcon({
  label,
  tooltipSide = "top",
}: {
  label: string;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Tooltip content={label} side={tooltipSide}>
      <span
        className="inline-flex shrink-0 text-muted-foreground"
        aria-label={label}
      >
        <Database className="h-3.5 w-3.5" aria-hidden />
      </span>
    </Tooltip>
  );
}
