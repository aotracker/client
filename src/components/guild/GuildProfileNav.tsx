"use client";

import { ProfileSectionNav } from "@/components/ProfileSectionNav";

const SECTIONS = [
  { id: "kills", label: "Kills" },
  { id: "rivals", label: "Rivals" },
  { id: "battles", label: "Battles" },
] as const;

export function GuildProfileNav() {
  return <ProfileSectionNav sections={SECTIONS} />;
}
