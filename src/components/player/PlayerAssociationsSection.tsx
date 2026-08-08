import { cache } from "react";
import { getPlayerAssociations } from "@/lib/db/queries";
import type { AlbionRegion } from "@/lib/albion/types";
import {
  PlayerAssociations,
  PlayerAssociationsFallback,
} from "./PlayerAssociations";

const loadAssociations = cache(async function loadAssociations(
  region: AlbionRegion,
  playerId: string
) {
  return getPlayerAssociations(region, playerId, { days: 30, limit: 15 });
});

export async function PlayerAssociationsSection({
  region,
  playerId,
}: {
  region: AlbionRegion;
  playerId: string;
}) {
  const data = await loadAssociations(region, playerId);
  return <PlayerAssociations allies={data.allies} />;
}

export { PlayerAssociationsFallback };
