import { NotFoundRecovery } from "@/components/NotFoundRecovery";
import { getServerPreferredRegion } from "@/lib/region-preference-server";
import { notFoundMetadata } from "@/lib/seo";

export const metadata = notFoundMetadata();

export default async function NotFound() {
  const preferredRegion = await getServerPreferredRegion();

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <NotFoundRecovery preferredRegion={preferredRegion} />
    </div>
  );
}
