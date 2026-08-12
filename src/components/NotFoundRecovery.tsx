"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  SearchAutocomplete,
  useSearchRegion,
} from "@/components/SearchAutocomplete";
import { isRegionEnabled, getDefaultRegion } from "@/lib/albion/types";
import { feedNavHref } from "@/lib/region-params";
import { getStoredPreferredRegion } from "@/lib/region-preference";

const ENTITY_RE =
  /^\/(kill|battle|player|guild|alliance)\/([a-z]+)\/([^/?#]+)\/?$/i;

export function NotFoundRecovery() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const t = useTranslations("Errors.notFound");
  const tNav = useTranslations("Nav");
  const tButtons = useTranslations("Common.buttons");
  const tKinds = useTranslations("Common.entityKinds");
  const [region, setRegion] = useSearchRegion(getDefaultRegion());
  const feedRegion = getStoredPreferredRegion();

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
        <p className="alert-warning rounded-md px-3 py-2 text-sm">
          {t("regionDisabled", { region: recovery.region })}
        </p>
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
            {recovery.entityType === "kill" || recovery.entityType === "battle"
              ? t("tryAgain")
              : t("queueFetch")}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href={feedNavHref("/", feedRegion)}
          className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent"
        >
          {tButtons("home")}
        </Link>
        <Link
          href={feedNavHref("/battles", feedRegion)}
          className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent"
        >
          {tNav("battles")}
        </Link>
        <Link
          href="/search"
          className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent"
        >
          {tNav("search")}
        </Link>
      </div>

      <div className="space-y-2 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("searchHeading")}
        </p>
        <SearchAutocomplete
          region={region}
          onRegionResolved={setRegion}
          showSubmitButton
        />
      </div>
    </div>
  );
}
