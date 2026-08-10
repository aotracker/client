import type { Metadata } from "next";
import {
  isOpsAuthDisabled,
  verifyOpsAccess,
} from "@/lib/jobs/cron-auth";
import { AdminLoginRequired } from "@/components/admin/AdminLoginRequired";
import { AdminFullWidth } from "@/components/admin/AdminFullWidth";
import { AdminShell } from "@/components/admin/AdminShell";
import { buildPageMetadata, NOINDEX_NOFOLLOW } from "@/lib/seo";

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
  const authorized = await verifyOpsAccess();
  if (!authorized && !isOpsAuthDisabled()) {
    return (
      <AdminFullWidth>
        <AdminLoginRequired />
      </AdminFullWidth>
    );
  }

  return (
    <AdminFullWidth>
      <AdminShell>{children}</AdminShell>
    </AdminFullWidth>
  );
}
