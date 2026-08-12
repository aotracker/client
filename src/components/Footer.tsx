"use client";

import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/BrandLogo";
import { ALBION_REF_URL, SITE_NAME } from "@/lib/site";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-background/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <BrandLogo size="sm" className="text-foreground" />
          <p>{t("copyright", { year, siteName: SITE_NAME })}</p>
          <p>{t("disclaimer", { siteName: SITE_NAME })}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/health"
            className="rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t("systemStatus")}
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
