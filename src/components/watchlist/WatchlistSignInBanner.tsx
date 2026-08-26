"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogIn } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { isSocialLoginVisible } from "@/lib/auth-providers";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWatchlist } from "@/components/watchlist/useWatchlist";

/** CTA when anonymous users have local pins — push them toward sign-in sync. */
export function WatchlistSignInBanner() {
  const t = useTranslations("Watchlist");
  const tAuth = useTranslations("Auth");
  const { data: session, isPending } = useSession();
  const { entries, ready, signedIn } = useWatchlist();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending || !ready) return null;
  if (!isSocialLoginVisible()) return null;
  if (signedIn || session?.user) return null;
  if (entries.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {t("syncTitle", { count: entries.length })}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("syncBody")}
        </p>
      </div>
      <Link
        href="/login?next=/watchlist"
        className={buttonClassName({ size: "sm", className: "shrink-0" })}
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden />
        {tAuth("signIn")}
      </Link>
    </Card>
  );
}
