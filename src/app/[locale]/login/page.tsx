import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSession, isSocialAuthConfigured } from "@/lib/auth";
import { buildPageMetadata, NOINDEX_FOLLOW } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}

function safeCallbackPath(raw: string | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function generateMetadata({
  params,
}: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });

  return buildPageMetadata({
    title: t("loginTitle"),
    description: t("loginMetaDescription", { siteName: SITE_NAME }),
    canonicalPath: "/login",
    robots: NOINDEX_FOLLOW,
    locale,
  });
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);

  const callbackURL = safeCallbackPath(next);
  const session = await getSession();
  if (session?.user) {
    redirect({ href: callbackURL, locale });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-10 sm:py-16">
      <LoginForm
        callbackURL={callbackURL}
        authConfigured={isSocialAuthConfigured()}
      />
    </div>
  );
}
