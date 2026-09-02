type Translate = (key: string, values?: Record<string, string | number>) => string;

export type KillCardCopy = {
  unknown: string;
  killed: string;
  highValue: string;
  highValueHint: string;
  orangeZone: string;
  orangeZoneHint: string;
  killDetails: string;
  kill: string;
  death: string;
  vodLabel: string;
  estVictimValue: string;
  mainHand: string;
  offHand: string;
  lootItems: (count: number) => string;
  assistItems: (count: number) => string;
  fameLabel: (formattedFame: string) => string;
  estGearValue: (formatted: string) => string;
  estLootValue: (formatted: string) => string;
};

export function buildKillCardCopy(
  t: Translate,
  tPlayer: Translate,
  tCommon: Translate,
  tMedia: Translate
): KillCardCopy {
  return {
    unknown: tCommon("labels.unknown"),
    killed: t("killed"),
    highValue: t("highValue"),
    highValueHint: t("highValueHint"),
    orangeZone: t("orangeZone"),
    orangeZoneHint: t("orangeZoneHint"),
    killDetails: tPlayer("killDetails"),
    kill: tPlayer("kill"),
    death: tPlayer("death"),
    vodLabel: tMedia("watchVod"),
    estVictimValue: tCommon("labels.estVictimValue"),
    mainHand: tCommon("labels.mainHand"),
    offHand: tCommon("labels.offHand"),
    lootItems: (count) => t("lootItems", { count }),
    assistItems: (count) => t("assistItems", { count }),
    fameLabel: (value) => tCommon("labels.killFameWithUnit", { value }),
    estGearValue: (value) => tCommon("labels.estGearValue", { value }),
    estLootValue: (value) => tCommon("labels.estLootValue", { value }),
  };
}
