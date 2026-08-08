import type { Metadata } from "next";
import { PageHeader } from "@/components/PageSection";
import { WatchlistPageContent } from "@/components/watchlist/WatchlistPageContent";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Watchlist",
  description:
    "Your pinned Albion Online players and guilds. Recent kill activity from your local watchlist.",
  canonicalPath: "/watchlist",
});

export default function WatchlistPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Watchlist"
        description="Pinned players and guilds stored in your browser. No account required."
      />
      <WatchlistPageContent />
    </div>
  );
}
