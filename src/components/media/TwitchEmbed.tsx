function embedParents(): string[] {
  const hosts = new Set<string>(["localhost"]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      hosts.add(new URL(appUrl).hostname);
    } catch {
      hosts.add("www.aotracker.net");
    }
  } else {
    hosts.add("www.aotracker.net");
  }
  return [...hosts];
}

export function TwitchEmbed({ login }: { login: string }) {
  const params = new URLSearchParams({
    channel: login,
    muted: "true",
    autoplay: "false",
  });
  for (const parent of embedParents()) {
    params.append("parent", parent);
  }

  return (
    <div className="aspect-video overflow-hidden rounded-lg border border-border/60 bg-muted/20">
      <iframe
        title={`${login} on Twitch`}
        src={`https://player.twitch.tv/?${params.toString()}`}
        className="h-full w-full"
        allowFullScreen
        allow="autoplay; encrypted-media"
      />
    </div>
  );
}
