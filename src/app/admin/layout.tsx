import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { AdminLoginRequired } from "@/components/admin/AdminLoginRequired";
import { AdminGateShell, AdminShell } from "@/components/admin/AdminShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { buildPageMetadata, NOINDEX_NOFOLLOW } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin",
  description: "AOTracker operator console.",
  canonicalPath: "/admin",
  robots: NOINDEX_NOFOLLOW,
});

/**
 * Operator console is English-only (no locale switcher).
 * Shared widgets (e.g. RelativeTime) still need next-intl client context,
 * so we mount English messages only. Public `[locale]` routes keep full i18n.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  setRequestLocale(DEFAULT_LOCALE);
  const messages = await getMessages({ locale: DEFAULT_LOCALE });
  const access = await verifyAdminSession();

  const body = !access.ok ? (
    <AdminGateShell>
      <AdminLoginRequired />
    </AdminGateShell>
  ) : (
    <AdminShell>{children}</AdminShell>
  );

  return (
    <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
      <ThemeProvider>
        <ToastProvider>{body}</ToastProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
