import { Loader2 } from "lucide-react";
import {
  ingestStatusMessage,
  type IngestEntityType,
} from "@/lib/ingest-status";

interface IngestingBannerProps {
  entityType: IngestEntityType;
}

export function IngestingBanner({ entityType }: IngestingBannerProps) {
  return (
    <div className="alert-info rounded-md px-3 py-2">
      <p className="flex items-center gap-2 text-xs">
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
        <span>{ingestStatusMessage(entityType)}</span>
      </p>
    </div>
  );
}
