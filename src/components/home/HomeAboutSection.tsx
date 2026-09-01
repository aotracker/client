import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageSection } from "@/components/PageSection";
import { SITE_NAME } from "@/lib/site";
import {
  appendFeedRegionToHref,
  type FeedRegion,
} from "@/lib/region-params";

function aboutLink(href: string) {
  return function AboutLink(chunks: ReactNode) {
    return (
      <Link
        href={href}
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        {chunks}
      </Link>
    );
  };
}

export async function HomeAboutSection({ region }: { region: FeedRegion }) {
  const t = await getTranslations("Home");

  return (
    <PageSection
      title={t("aboutTitle", { siteName: SITE_NAME })}
      className="border-t border-border pt-6"
    >
      <p className="max-w-3xl text-sm text-muted-foreground">
        {t.rich("aboutBody", {
          siteName: SITE_NAME,
          kills: aboutLink(appendFeedRegionToHref("/kills", region)),
          battles: aboutLink(appendFeedRegionToHref("/battles", region)),
          leaderboards: aboutLink(
            appendFeedRegionToHref("/leaderboards", region)
          ),
          builds: aboutLink(appendFeedRegionToHref("/builds", region)),
          discord: aboutLink("/discord"),
        })}
      </p>
    </PageSection>
  );
}
