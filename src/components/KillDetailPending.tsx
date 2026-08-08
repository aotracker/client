"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { Card, CardContent } from "@/components/ui/card";
import { regionLabel } from "@/lib/utils";

interface KillDetailPendingProps {
  region: string;
  eventId: number;
}

export function KillDetailPending({ region, eventId }: KillDetailPendingProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="space-y-6">
      <BackLink />

      <Card className="border-info-border/30">
        <CardContent className="flex flex-col items-center px-6 py-12 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-info" />
          <h1 className="text-xl font-semibold">Fetching kill details</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            This kill is being fetched from Albion Online and will be available
            shortly. This page refreshes automatically every few seconds.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            {regionLabel(region)} · Kill ID #{eventId}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
