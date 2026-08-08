import { Suspense } from "react";
import { getGlobalSyncStatus } from "@/lib/db/queries";
import { StatusBannerClient } from "@/components/StatusBannerClient";

async function StatusBannerContent() {
  let status;
  try {
    status = await getGlobalSyncStatus();
  } catch {
    return null;
  }

  if (status.isHealthy || !status.message) return null;

  return <StatusBannerClient message={status.message} />;
}

/** Non-blocking sync health banner — Suspense keeps page content from waiting on the DB check. */
export function StatusBanner() {
  return (
    <Suspense fallback={null}>
      <StatusBannerContent />
    </Suspense>
  );
}
