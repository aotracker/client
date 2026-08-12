import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  isOpsAuthDisabled,
  verifyOpsAccess,
} from "@/lib/jobs/cron-auth";
import { AdminLoginRequired } from "@/components/admin/AdminLoginRequired";
import { AdminFullWidth } from "@/components/admin/AdminFullWidth";
import { AdminShell } from "@/components/admin/AdminShell";
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
      <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
        <AdminFullWidth>
          <AdminLoginRequired />
        </AdminFullWidth>
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={messages}>
      <AdminFullWidth>
        <AdminShell>{children}</AdminShell>
      </AdminFullWidth>
    </NextIntlClientProvider>
  );
}
