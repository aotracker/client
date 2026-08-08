"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  SearchAutocomplete,
  useSearchRegion,
} from "@/components/SearchAutocomplete";
import { isRegionEnabled, getDefaultRegion } from "@/lib/albion/types";

const ENTITY_RE =
  /^\/(kill|battle|player|guild|alliance)\/([a-z]+)\/([^/?#]+)\/?$/i;

export function NotFoundRecovery() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [region, setRegion] = useSearchRegion(getDefaultRegion());

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

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 text-center">
      <div>
        <h1 className="font-display text-5xl font-bold tracking-tight">404</h1>
        <p className="mt-2 text-muted-foreground">
          This page could not be found.
        </p>
      </div>

      {recovery?.kind === "disabled" && (
        <p className="alert-warning rounded-md px-3 py-2 text-sm">
          The <span className="font-medium">{recovery.region}</span> region is
          disabled on this site.
        </p>
      )}

      {recovery?.kind === "entity" && (
        <div className="space-y-3 rounded-md border border-border bg-card p-4 text-left">
          <p className="text-sm text-muted-foreground">
            This looks like a{" "}
            <span className="font-medium text-foreground">
              {recovery.entityType}
            </span>{" "}
            link. You can try loading it again — profiles and kills are fetched
            on demand when missing from the cache.
          </p>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => router.push(recovery.path)}
          >
            {recovery.entityType === "kill" || recovery.entityType === "battle"
              ? "Try loading again"
              : "Queue profile fetch"}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent"
        >
          Home
        </Link>
        <Link
          href="/battles"
          className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent"
        >
          Battles
        </Link>
        <Link
          href="/search"
          className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-accent"
        >
          Search
        </Link>
      </div>

      <div className="space-y-2 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Search
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
