"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  Hammer,
  Home,
  RefreshCw,
  Search,
  Skull,
  Star,
  Swords,
  Trophy,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { InlineAlert } from "@/components/InlineAlert";
import { Button, buttonClassName } from "@/components/ui/button";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { isRegionEnabled } from "@/lib/albion/types";
import { feedNavHref } from "@/lib/region-params";
import {
  getStoredPreferredRegion,
  type PreferredRegion,
} from "@/lib/region-preference";

const ENTITY_RE =
  /^\/(kill|battle|player|guild|alliance)\/([a-z]+)\/([^/?#]+)\/?$/i;

export function NotFoundRecovery({
  preferredRegion = null,
}: {
  preferredRegion?: PreferredRegion | null;
}) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const t = useTranslations("Errors.notFound");
  const tNav = useTranslations("Nav");
  const tButtons = useTranslations("Common.buttons");
  const tKinds = useTranslations("Common.entityKinds");
  const [feedRegion, setFeedRegion] = useState(preferredRegion);

  useEffect(() => {
    setFeedRegion(getStoredPreferredRegion() ?? preferredRegion);
  }, [preferredRegion]);

  const recovery = useMemo(() => {
    const match = pathname.match(ENTITY_RE);
    if (!match) return null;
    const [, type, regionSlug, id] = match;
    const entityType = type.toLowerCase();
    if (!isRegionEnabled(regionSlug)) {
      return { kind: "disabled" as const, region: regionSlug };
    }
    return {
      kind: "entity" as const,
      entityType,
      region: regionSlug,
      id: decodeURIComponent(id),
      path: `/${entityType}/${regionSlug}/${decodeURIComponent(id)}`,
    };
  }, [pathname]);

  const entityKindLabel =
    recovery?.kind === "entity" &&
    (recovery.entityType === "player" ||
      recovery.entityType === "guild" ||
      recovery.entityType === "alliance" ||
      recovery.entityType === "kill" ||
      recovery.entityType === "battle")
      ? tKinds(recovery.entityType)
      : recovery?.kind === "entity"
        ? recovery.entityType
        : "";

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 text-center">
      <div>
        <h1 className="font-display text-5xl font-bold tracking-tight">
          {t("code")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("message")}</p>
      </div>

      {recovery?.kind === "disabled" && (
        <InlineAlert variant="warning" className="px-3 py-2 text-left">
          {t("regionDisabled", { region: recovery.region })}
        </InlineAlert>
      )}

      {recovery?.kind === "entity" && (
        <div className="space-y-3 rounded-md border border-border bg-card p-4 text-left">
          <p className="text-sm text-muted-foreground">
            {t("entityHint", { entityType: entityKindLabel })}
          </p>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => router.push(recovery.path)}
          >
            {recovery.entityType === "kill" || recovery.entityType === "battle" ? (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Download className="h-3.5 w-3.5" aria-hidden />
            )}
            {recovery.entityType === "kill" || recovery.entityType === "battle"
              ? t("tryAgain")
              : t("queueFetch")}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href={feedNavHref("/", feedRegion)}
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          <Home className="h-3.5 w-3.5" aria-hidden />
          {tButtons("home")}
        </Link>
        <Link
          href={feedNavHref("/kills", feedRegion)}
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          <Skull className="h-3.5 w-3.5" aria-hidden />
          {tNav("kills")}
        </Link>
        <Link
          href={feedNavHref("/leaderboards", feedRegion)}
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          <Trophy className="h-3.5 w-3.5" aria-hidden />
          {tNav("leaderboards")}
        </Link>
        <Link
          href={feedNavHref("/battles", feedRegion)}
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          <Swords className="h-3.5 w-3.5" aria-hidden />
          {tNav("battles")}
        </Link>
        <Link
          href={feedNavHref("/builds", feedRegion)}
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          <Hammer className="h-3.5 w-3.5" aria-hidden />
          {tNav("builds")}
        </Link>
        <Link
          href="/watchlist"
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          <Star className="h-3.5 w-3.5" aria-hidden />
          {tNav("watchlist")}
        </Link>
        <Link
          href="/search"
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          {tNav("search")}
        </Link>
      </div>

      <div className="space-y-2 text-left">
        <p className="text-label">
          {t("searchHeading")}
        </p>
        <SearchAutocomplete
          region={feedRegion ?? "all"}
          showSubmitButton
        />
      </div>
    </div>
  );
}
