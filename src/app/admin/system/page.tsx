import { PageHeader } from "@/components/PageSection";
import { SystemInfoPanel } from "@/components/admin/SystemInfoPanel";
import { getSystemInfoSnapshot } from "@/lib/ops/system-info";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const snapshot = await getSystemInfoSnapshot();

  return (
    <div className="space-y-6">
      <PageHeader
        title="System"
        description="Live memory, CPU, disk, and service health"
      />
      <SystemInfoPanel initial={snapshot} />
    </div>
  );
}
