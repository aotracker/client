"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  hasApiLogErrorDetails,
  parseApiLogDetails,
} from "@/lib/ops/api-log-display";
import type { ApiRequestLogRow } from "@/lib/ops/api-log-queries";

export function ApiLogErrorCell({ log }: { log: ApiRequestLogRow }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseApiLogDetails(log.details, log.errorMessage);
  const expandable = hasApiLogErrorDetails(parsed, log.errorMessage);

  if (log.status === "success") {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="space-y-2 min-w-[16rem] max-w-3xl">
      <div className="flex flex-wrap items-center gap-1.5">
        {log.errorType && (
          <Badge variant="outline" className="font-mono text-xs">
            {log.errorType}
          </Badge>
        )}
        {parsed.statusCode != null && (
          <Badge variant="zvz" className="font-mono text-xs">
            HTTP {parsed.statusCode}
            {parsed.statusText ? ` ${parsed.statusText}` : ""}
          </Badge>
        )}
        {parsed.attempt != null && parsed.maxAttempts != null && (
          <span className="text-xs text-muted-foreground">
            attempt {parsed.attempt}/{parsed.maxAttempts}
          </span>
        )}
      </div>

      {log.errorMessage && (
        <p className="text-xs text-foreground/90 break-words whitespace-pre-wrap">
          {log.errorMessage}
        </p>
      )}

      {expandable && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-primary hover:underline"
        >
          {expanded ? "Hide details" : "Show full details"}
        </button>
      )}

      {expanded && (
        <dl className="rounded-md border border-border/50 bg-muted/20 p-3 text-xs space-y-2">
          {parsed.url && (
            <DetailRow label="URL">
              <a
                href={parsed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {parsed.url}
              </a>
            </DetailRow>
          )}
          {parsed.path && (
            <DetailRow label="Path">
              <code className="break-all">{parsed.path}</code>
            </DetailRow>
          )}
          {parsed.method && (
            <DetailRow label="Method" value={parsed.method} />
          )}
          {parsed.timeoutMs != null && (
            <DetailRow label="Timeout" value={`${parsed.timeoutMs}ms`} />
          )}
          {parsed.networkCause && (
            <DetailRow label="Network cause">
              <span className="break-words">{parsed.networkCause}</span>
            </DetailRow>
          )}
          {parsed.responseBody && (
            <DetailRow label="Response body">
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-background/60 p-2 text-xs">
                {parsed.responseBody}
              </pre>
            </DetailRow>
          )}
          {log.details != null &&
            typeof log.details === "object" &&
            Object.keys(log.details as object).length > 0 && (
              <DetailRow label="Raw details">
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-background/60 p-2 text-xs">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </DetailRow>
            )}
        </dl>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground/90">
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}
