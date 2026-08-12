import { Card, CardContent } from "@/components/ui/card";

export function AdminLoginRequired() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Sign in required
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This operator console needs the ops secret before you can continue.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
          <p>Authenticate with one of these options:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Open{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                /api/ops-login?key=YOUR_CRON_SECRET
              </code>{" "}
              once to set a cookie
            </li>
            <li>
              Call admin APIs with{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                Authorization: Bearer …
              </code>
            </li>
          </ul>
          <p>
            Public health stays available at{" "}
            <a href="/health" className="text-primary hover:underline">
              /health
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
