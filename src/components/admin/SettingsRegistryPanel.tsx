import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConfigRegistryGroup } from "@/lib/ops/config-registry";

export function SettingsRegistryPanel({
  groups,
}: {
  groups: ConfigRegistryGroup[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <Card key={group.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.items.map((item) => (
              <div
                key={item.name}
                className="rounded-md border border-border/50 px-3 py-2 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.source}
                </p>
                {item.note && (
                  <p className="mt-1 text-xs text-warning-foreground">{item.note}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
