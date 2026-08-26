"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LoginButtons } from "@/components/auth/LoginButtons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {t("loginTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("loginDescription")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {showButtons ? (
          <LoginButtons callbackURL={callbackURL} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("loginUnavailable")}
          </p>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t.rich("loginLegal", {
            privacy: (chunks) => (
              <Link href="/privacy" className="text-primary hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </CardContent>
    </Card>
  );
}
