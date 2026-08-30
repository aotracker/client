import { Button } from "@/components/ui/button";
import { TwitchIcon } from "@/components/media/TwitchIcon";

export function TwitchWatchButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      size="sm"
      variant="outline"
      className="border-twitch/40 text-twitch"
    >
      <TwitchIcon className="h-3.5 w-3.5 shrink-0" />
      {children}
    </Button>
  );
}
