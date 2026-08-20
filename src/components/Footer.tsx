"use client";

import { useTranslations } from "next-intl";
import { Activity } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ALBION_REF_URL, SITE_NAME } from "@/lib/site";
import { feedNavHref } from "@/lib/region-params";
import type { PreferredRegion } from "@/lib/region-preference";
import { Link } from "@/i18n/navigation";

export function Footer({
  preferredRegion = null,
}: {
  preferredRegion?: PreferredRegion | null;
}) {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-background/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <BrandLogo
            href={feedNavHref("/", preferredRegion)}
            size="sm"
            className="text-foreground"
          />
          <p>{t("copyright", { year, siteName: SITE_NAME })}</p>
          <p>{t("disclaimer", { siteName: SITE_NAME })}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/health"
            className="inline-flex items-center gap-1.5 rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Activity className="h-3.5 w-3.5" aria-hidden />
            {t("systemStatus")}
          </Link>
          <Link
            href="/discord"
            className="rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t("discordBot")}
          </Link>
          <Link
            href="/contact"
            className="rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t("contact")}
          </Link>
          <Link
            href="/privacy"
            className="rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t("privacyPolicy")}
          </Link>
          <a
            href={ALBION_REF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 items-center justify-center rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t("getAlbion")}
          </a>
        </div>
      </div>
    </footer>
  );
}
