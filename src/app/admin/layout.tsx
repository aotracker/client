import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  isOpsAuthDisabled,
  verifyOpsAccess,
} from "@/lib/jobs/cron-auth";
import { AdminLoginRequired } from "@/components/admin/AdminLoginRequired";
import { AdminGateShell, AdminShell } from "@/components/admin/AdminShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { buildPageMetadata, NOINDEX_NOFOLLOW } from "@/lib/seo";
import { DEFAULT_LOCALE } from "@/i18n/locales";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin",
  description: "AOTracker operator console.",
  canonicalPath: "/admin",
  robots: NOINDEX_NOFOLLOW,
});

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = (await import(`../../../messages/${DEFAULT_LOCALE}.json`))
    .default;

  const authorized = await verifyOpsAccess();
  if (!authorized && !isOpsAuthDisabled()) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
            <AdminGateShell>
              <AdminLoginRequired />
            </AdminGateShell>
          </NextIntlClientProvider>
        </ToastProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
          <AdminShell>{children}</AdminShell>
        </NextIntlClientProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
