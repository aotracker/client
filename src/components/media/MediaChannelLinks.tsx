import { TwitchWatchButton } from "@/components/media/TwitchWatchButton";
import { YoutubeWatchButton } from "@/components/media/YoutubeWatchButton";
import {
  twitchChannelUrl,
  youtubeChannelUrl,
  type MediaPlatform,
} from "@/lib/media/urls";

export function MediaChannelLinks({
  links,
  twitchLabel,
  youtubeLabel,
}: {
  links: Array<{
    platform: MediaPlatform;
    login: string;
    channelId: string;
  }>;
  twitchLabel: string;
  youtubeLabel: string;
}) {
  if (links.length === 0) return null;
  return (
    <>
      {links.map((link) => {
        if (link.platform === "twitch") {
          return (
            <TwitchWatchButton
              key={`${link.platform}-${link.channelId}`}
              href={twitchChannelUrl(link.login)}
            >
              {twitchLabel}
            </TwitchWatchButton>
          );
        }
        return (
          <YoutubeWatchButton
            key={`${link.platform}-${link.channelId}`}
            href={youtubeChannelUrl(link.channelId)}
          >
            {youtubeLabel}
          </YoutubeWatchButton>
        );
      })}
    </>
  );
}
