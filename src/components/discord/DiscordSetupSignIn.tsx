"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DiscordIcon } from "@/components/auth/AuthIcons";
import { Button } from "@/components/ui/button";
import { startSocialSignIn } from "@/lib/social-sign-in";

export function DiscordSetupSignIn({ mode }: { mode: "sign-in" | "link" }) {
  const tAuth = useTranslations("Auth");
  const tFeeds = useTranslations("Discord.feeds");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    setPending(true);
    const result = await startSocialSignIn({
      provider: "discord",
      callbackURL: "/account/discord",
      fallbackError: tAuth("signInError"),
    });
    if (!result.ok) {
      setError(result.message);
      setPending(false);
    }
  }

  const label =
    mode === "link" ? tFeeds("linkDiscord") : tAuth("signInWithDiscord");

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-xs text-danger-foreground" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => void signIn()}
      >
        <DiscordIcon className="h-4 w-4 text-discord" />
        {pending ? tAuth("signingIn") : label}
      </Button>
    </div>
  );
}
