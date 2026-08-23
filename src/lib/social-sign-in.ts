import type { SocialAuthProvider } from "@/lib/auth-providers";

type SocialSignInResult = Awaited<
  ReturnType<
    typeof import("@/lib/auth-client").authClient.signIn.social
  >
>;

export function socialSignInErrorMessage(
  result: SocialSignInResult,
  fallback: string
): string {
  const err = result.error;
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

export function redirectFromSocialSignIn(result: SocialSignInResult): boolean {
  const url = result.data?.url;
  const shouldRedirect = result.data?.redirect;
  if (!url || !shouldRedirect) return false;
  window.location.assign(url);
  return true;
}

export type SocialSignInOptions = {
  provider: SocialAuthProvider;
  callbackURL: string;
  fallbackError: string;
};

export async function startSocialSignIn({
  provider,
  callbackURL,
  fallbackError,
}: SocialSignInOptions): Promise<{ ok: true } | { ok: false; message: string }> {
  const { authClient } = await import("@/lib/auth-client");
  const result = await authClient.signIn.social({
    provider,
    callbackURL,
  });

  if (result.error) {
    return {
      ok: false,
      message: socialSignInErrorMessage(result, fallbackError),
    };
  }

  if (redirectFromSocialSignIn(result)) {
    return { ok: true };
  }

  return {
    ok: false,
    message: fallbackError,
  };
}
