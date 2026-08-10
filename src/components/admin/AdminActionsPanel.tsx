"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/Toast";

export function AdminActionsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  async function runAction(
    key: string,
    path: string,
    label: string
  ): Promise<void> {
    setLoading(key);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        jobId?: string;
      } | null;
      if (!res.ok) {
        toast(data?.error ?? `${label} failed (${res.status})`);
        return;
      }
      const suffix = data?.jobId ? ` (job ${data.jobId})` : "";
      toast(`${label} triggered${suffix}`);
    } catch {
      toast(`${label} request failed`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manual triggers</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={loading !== null}
          onClick={() =>
            runAction(
              "ingest",
              "/api/admin/actions/ingest-poll",
              "Ingest poll"
            )
          }
        >
          {loading === "ingest" ? "Triggering…" : "Trigger ingest poll"}
        </Button>
        <Button
          variant="outline"
          disabled={loading !== null}
          onClick={() =>
            runAction(
              "health",
              "/api/admin/actions/health-check",
              "Health check"
            )
          }
        >
          {loading === "health" ? "Triggering…" : "Trigger health check"}
        </Button>
      </CardContent>
    </Card>
  );
}
