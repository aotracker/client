import { getTranslations } from "next-intl/server";
import type { AlbionRegion } from "@/lib/albion/types";
import { estimateItemValues } from "@/lib/market/estimate-gear-value";
import {
  LootSection,
  type KillDetailItem,
} from "@/components/KillDetailView";

function toValueItems(items: KillDetailItem[]) {
  return items.map((item) => ({
    itemType: item.itemType,
    quality: item.quality,
    count: item.count,
  }));
}

export async function KillLootWithEstimates({
  region,
  victimLoot,
  victimName,
}: {
  region: AlbionRegion;
  victimLoot: KillDetailItem[];
  victimName: string;
}) {
  const t = await getTranslations("Kill");
  const tLabels = await getTranslations("Common.labels");
  const estimate = await estimateItemValues(
    region,
    toValueItems(victimLoot)
  ).catch(() => null);

  const items =
    estimate?.items.map((priced, index) => ({
      ...victimLoot[index],
      estSilver: priced.totalSilver > 0 ? priced.totalSilver : null,
    })) ?? victimLoot;

  const lootEstSilver =
    estimate && estimate.totalSilver > 0 ? estimate.totalSilver : null;

  return (
    <LootSection
      victimLoot={items}
      lootEstSilver={lootEstSilver}
      title={t("victimLoot")}
      itemsDropped={t("itemsDropped", { count: victimLoot.length })}
      lootDescription={t("lootDescription", { victimName })}
      estValueLabel={(value) => tLabels("estValue", { value })}
    />
  );
}

export function KillLootFallback({
  victimLoot,
  title,
  itemsDropped,
  lootDescription,
}: {
  victimLoot: KillDetailItem[];
  title: string;
  itemsDropped: string;
  lootDescription: string;
}) {
  return (
    <LootSection
      victimLoot={victimLoot}
      title={title}
      itemsDropped={itemsDropped}
      lootDescription={lootDescription}
      loading
    />
  );
}
