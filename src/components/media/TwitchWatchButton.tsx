import { Button } from "@/components/ui/button";
import { TwitchIcon } from "@/components/media/TwitchIcon";
import { cn } from "@/lib/utils";

export function TwitchWatchButton({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      size="sm"
      variant="outline"
      className={cn(
        "shrink-0 whitespace-nowrap border-twitch/40 text-twitch",
        className
      )}
    >
      <TwitchIcon className="h-3.5 w-3.5 shrink-0" />
      {children}
    </Button>
  );
}
