"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  isDiscordLoginVisible,
  isGoogleLoginVisible,
  type SocialAuthProvider,
} from "@/lib/auth-providers";
import { startSocialSignIn } from "@/lib/social-sign-in";
import { DiscordIcon, GoogleIcon } from "@/components/auth/AuthIcons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LoginButtonLabels = {
  signInWithDiscord: string;
  signInWithGoogle: string;
  signingIn: string;
  loginUnavailable: string;
  signInError: string;
};

/** English copy for operator surfaces that stay locale-free (e.g. /admin). */
export const LOGIN_BUTTON_LABELS_EN: LoginButtonLabels = {
  signInWithDiscord: "Continue with Discord",
  signInWithGoogle: "Continue with Google",
  signingIn: "Redirecting…",
  loginUnavailable: "Sign-in is not configured on this environment yet.",
  signInError:
    "Could not start sign-in. Confirm auth env vars on the server and try again.",
};

type LoginButtonsProps = {
  callbackURL?: string;
  className?: string;
  size?: "sm" | "md";
  onBeforeSignIn?: () => void;
  /** When set, skip next-intl and use these strings (admin / English-only). */
  labels?: LoginButtonLabels;
};

function LoginButtonsView({
  callbackURL = "/",
  className,
  size = "md",
  onBeforeSignIn,
  labels,
}: LoginButtonsProps & { labels: LoginButtonLabels }) {
  const [pending, setPending] = useState<SocialAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showDiscord = isDiscordLoginVisible();
  const showGoogle = isGoogleLoginVisible();

  if (!showDiscord && !showGoogle) {
    return (
      <p className="text-sm text-muted-foreground">{labels.loginUnavailable}</p>
    );
  }

  async function signIn(provider: SocialAuthProvider) {
    onBeforeSignIn?.();
    setError(null);
    setPending(provider);
    const result = await startSocialSignIn({
      provider,
      callbackURL,
      fallbackError: labels.signInError,
    });
    if (!result.ok) {
      setError(result.message);
      setPending(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {error ? (
        <p className="text-xs text-danger-foreground" role="alert">
          {error}
        </p>
      ) : null}
      {showDiscord ? (
        <Button
          type="button"
          variant="outline"
          size={size}
          className="w-full"
          disabled={pending !== null}
          onClick={() => void signIn("discord")}
        >
          <DiscordIcon className="h-4 w-4 shrink-0 text-discord" />
          {pending === "discord"
            ? labels.signingIn
            : labels.signInWithDiscord}
        </Button>
      ) : null}
      {showGoogle ? (
        <Button
          type="button"
          variant="outline"
          size={size}
          className="w-full"
          disabled={pending !== null}
          onClick={() => void signIn("google")}
        >
          <GoogleIcon className="h-4 w-4 shrink-0" />
          {pending === "google" ? labels.signingIn : labels.signInWithGoogle}
        </Button>
      ) : null}
    </div>
  );
}

/** Localized login buttons for public / account surfaces. */
export function LoginButtons(props: Omit<LoginButtonsProps, "labels">) {
  const t = useTranslations("Auth");
  return (
    <LoginButtonsView
      {...props}
      labels={{
        signInWithDiscord: t("signInWithDiscord"),
        signInWithGoogle: t("signInWithGoogle"),
        signingIn: t("signingIn"),
        loginUnavailable: t("loginUnavailable"),
        signInError: t("signInError"),
      }}
    />
  );
}

/** English-only login buttons for /admin (no next-intl). */
export function LoginButtonsEnglish(props: Omit<LoginButtonsProps, "labels">) {
  return <LoginButtonsView {...props} labels={LOGIN_BUTTON_LABELS_EN} />;
}
