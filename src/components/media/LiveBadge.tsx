import { Badge } from "@/components/ui/badge";

export function LiveBadge({ label }: { label: string }) {
  return (
    <Badge
      variant="outline"
      size="sm"
      className="border-twitch/40 bg-twitch/15 text-twitch"
    >
      {label}
    </Badge>
  );
}
