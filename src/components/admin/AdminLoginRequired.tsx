import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageSection";

export function AdminLoginRequired() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Operator console — authentication required"
      />
      <Card>
        <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
          <p>This area requires the ops secret.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Open{" "}
              <code className="text-foreground">
                /api/ops-login?key=YOUR_CRON_SECRET
              </code>{" "}
              once to set a cookie, or
            </li>
            <li>
              Call admin APIs with{" "}
              <code className="text-foreground">Authorization: Bearer …</code>
            </li>
          </ul>
          <p>
            Public health is available at{" "}
            <Link href="/health" className="text-primary hover:underline">
              /health
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
