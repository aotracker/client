import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquipmentGrid } from "@/components/KillGearPanels";
import { ItemPowerValue } from "@/components/StatValue";
import { Skeleton } from "@/components/ui/skeleton";
import { formatItemPower, formatSilver } from "@/lib/utils";
import type { KillDetailItem } from "@/components/KillDetailView";

export interface KillGearSectionProps {
  killerEquipment: KillDetailItem[];
  victimEquipment: KillDetailItem[];
  killerIp: string | null;
  victimIp: string | null;
  killerEstSilver?: number | null;
  victimEstSilver?: number | null;
  loading?: boolean;
}

export function KillGearSection({
  killerEquipment,
  victimEquipment,
  killerIp,
  victimIp,
  killerEstSilver,
  victimEstSilver,
  loading = false,
}: KillGearSectionProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base text-stat-kill">
              Killer&apos;s Equipment
            </CardTitle>
            {loading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              killerEstSilver != null &&
              killerEstSilver > 0 && (
                <p className="shrink-0 text-sm text-muted-foreground">
                  Est. value: {formatSilver(killerEstSilver)}
                </p>
              )
            )}
          </div>
          {formatItemPower(killerIp) && (
            <p className="text-sm text-muted-foreground">
              Average IP:{" "}
              <ItemPowerValue value={killerIp} withSuffix={false} />
            </p>
          )}
        </CardHeader>
        <CardContent>
          <EquipmentGrid items={killerEquipment} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base text-stat-death">
              Victim&apos;s Equipment
            </CardTitle>
            {loading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              victimEstSilver != null &&
              victimEstSilver > 0 && (
                <p className="shrink-0 text-sm text-muted-foreground">
                  Est. value: {formatSilver(victimEstSilver)}
                </p>
              )
            )}
          </div>
          {formatItemPower(victimIp) && (
            <p className="text-sm text-muted-foreground">
              Average IP:{" "}
              <ItemPowerValue value={victimIp} withSuffix={false} />
            </p>
          )}
        </CardHeader>
        <CardContent>
          <EquipmentGrid items={victimEquipment} />
        </CardContent>
      </Card>
    </div>
  );
}
