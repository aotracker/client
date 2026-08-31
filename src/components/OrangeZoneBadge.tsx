import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";

/** In-game orange-zone cluster marker (HUD / world map hexagon). */
export function OrangeZoneIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M12 2.2 21.4 7.6v8.8L12 21.8 2.6 16.4V7.6L12 2.2z" />
    </svg>
  );
}

export function OrangeZoneBadge({
  label,
  hint,
}: {
  label: string;
  hint?: string;
}) {
  const badge = (
    <Badge
      size="sm"
      className="gap-0.5 border-warning/40 bg-warning/15 pl-0.5 pr-1.5 text-warning"
    >
      <OrangeZoneIcon className="size-2.5 shrink-0" />
      {label}
    </Badge>
  );

  if (!hint) return badge;
  return <Tooltip content={hint}>{badge}</Tooltip>;
}
