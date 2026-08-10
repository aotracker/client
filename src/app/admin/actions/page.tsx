import { PageHeader } from "@/components/PageSection";
import { AdminActionsPanel } from "@/components/admin/AdminActionsPanel";

export const dynamic = "force-dynamic";

export default function AdminActionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Actions"
        description="Manual scheduler triggers via the ingest HTTP API"
      />
      <AdminActionsPanel />
    </div>
  );
}
