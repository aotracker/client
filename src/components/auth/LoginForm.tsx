"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LoginButtons } from "@/components/auth/LoginButtons";
import { isSocialLoginVisible } from "@/lib/auth-providers";

export function LoginForm({
  callbackURL = "/",
  authConfigured,
}: {
  callbackURL?: string;
  /** Server already checked secrets; still gate UI on public client ids. */
  authConfigured: boolean;
}) {
  const t = useTranslations("Auth");
  const showButtons = authConfigured && isSocialLoginVisible();

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="space-y-2 border-b border-border px-5 py-5 sm:px-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {t("loginTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("loginDescription")}</p>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        {showButtons ? (
          <LoginButtons callbackURL={callbackURL} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("loginUnavailable")}
          </p>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t.rich("loginLegal", {
            privacy: (chunks) => (
              <Link href="/privacy" className="text-primary hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
