import { Button } from "@/components/ui/button";
import { YoutubeIcon } from "@/components/media/YoutubeIcon";

export function YoutubeWatchButton({
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
      className="border-youtube/40 text-youtube"
    >
      <YoutubeIcon className="h-3.5 w-3.5 shrink-0" />
      {children}
    </Button>
  );
}
