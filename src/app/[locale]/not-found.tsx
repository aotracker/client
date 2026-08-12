import { NotFoundRecovery } from "@/components/NotFoundRecovery";
import { notFoundMetadata } from "@/lib/seo";

export const metadata = notFoundMetadata();

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <NotFoundRecovery />
    </div>
  );
}
