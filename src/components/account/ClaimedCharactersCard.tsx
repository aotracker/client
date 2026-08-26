"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ExternalLink, UserRound } from "lucide-react";
import { ENABLED_REGIONS, type AlbionRegion } from "@/lib/albion/types";
import { playerPath } from "@/lib/seo";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";

type ClaimedCharacter = {
  id: string;
  region: AlbionRegion;
  albionId: string;
  name: string;
  claimedAt: string;
};

type PlayerHit = {
  albionId: string;
  name: string;
  region: AlbionRegion;
};

export function ClaimedCharactersCard() {
  const t = useTranslations("Account");
  const tRegions = useTranslations("Common.regions");
  const [claims, setClaims] = useState<ClaimedCharacter[]>([]);
  const [region, setRegion] = useState<AlbionRegion>(ENABLED_REGIONS[0] ?? "americas");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlayerHit[]>([]);
  const [pending, setPending] = useState<PlayerHit | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/user/claims", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { claims?: ClaimedCharacter[] };
    setClaims(Array.isArray(data.claims) ? data.claims : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const id = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, region, limit: "8" });
        const res = await fetch(`/api/search?${params}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          local?: { players?: PlayerHit[] };
        };
        const players = (data.local?.players ?? []).filter(
          (player) => player.region === region
        );
        setHits(players.slice(0, 8));
      } catch {
        setHits([]);
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [query, region]);

  async function confirmClaim() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/user/claims", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: pending.region,
          albionId: pending.albionId,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        claim?: ClaimedCharacter;
      } | null;
      if (res.status === 429) {
        setError(t("claimRateLimited"));
        return;
      }
      if (res.status === 409 || data?.error === "taken") {
        setError(t("claimTaken"));
        return;
      }
      if (!res.ok) {
        setError(t("claimError"));
        return;
      }
      setMessage(t("claimSaved"));
      setPending(null);
      setQuery("");
      setHits([]);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function unclaim(claimRegion: AlbionRegion) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/user/claims?region=${encodeURIComponent(claimRegion)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setError(t("unclaimError"));
        return;
      }
      setMessage(t("unclaimed"));
      await load();
    } finally {
      setBusy(false);
    }
  }

  const regionOptions = ENABLED_REGIONS.map((value) => ({
    value,
    label: tRegions(value),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground/90">
          <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {t("claimsTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("claimsBody")}</p>
      </div>

      {claims.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("claimsEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {claims.map((claim) => (
            <li key={claim.id}>
              <Card variant="muted" className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground/90">
                  {claim.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tRegions(claim.region)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={playerPath(claim.region, claim.name)}
                  className={buttonClassName({ variant: "outline", size: "sm" })}
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  {t("claimOpenProfile")}
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void unclaim(claim.region)}
                >
                  {t("unclaim")}
                </Button>
              </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <label className="space-y-1.5 text-sm">
          <span className="text-label">{t("claimRegion")}</span>
          <FilterSelect
            className="w-full"
            aria-label={t("claimRegion")}
            value={region}
            options={regionOptions}
            disabled={busy}
            onChange={(next) => {
              setRegion(next);
              setPending(null);
            }}
          />
        </label>
        <label className="min-w-0 space-y-1.5 text-sm">
          <span className="text-label">{t("claimSearch")}</span>
          <Input
            size="sm"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPending(null);
            }}
            disabled={busy}
            placeholder={t("claimSearchPlaceholder")}
            autoComplete="off"
          />
        </label>
      </div>

      {hits.length > 0 && !pending ? (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {hits.map((hit) => (
            <li key={`${hit.region}:${hit.albionId}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setPending(hit)}
              >
                <span className="truncate font-medium">{hit.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {tRegions(hit.region)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {pending ? (
        <div className="flex flex-col gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/90">
            {t("claimConfirm", { name: pending.name })}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              {t("claimCancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void confirmClaim()}
            >
              {busy ? t("claiming") : t("claimConfirmButton")}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-danger-foreground">{error}</p> : null}
      {message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
