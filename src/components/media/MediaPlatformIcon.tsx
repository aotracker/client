import { TwitchIcon } from "@/components/media/TwitchIcon";
import { YoutubeIcon } from "@/components/media/YoutubeIcon";
import { cn } from "@/lib/utils";
import type { MediaPlatform } from "@/lib/media/urls";

export function MediaPlatformIcon({
  platform,
  className,
  label,
}: {
  platform: MediaPlatform;
  className?: string;
  label?: string;
}) {
  const Icon = platform === "twitch" ? TwitchIcon : YoutubeIcon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0",
        platform === "twitch" ? "text-twitch" : "text-youtube",
        className
      )}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
