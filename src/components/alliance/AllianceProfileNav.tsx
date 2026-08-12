"use client";

import { ProfileSectionNav } from "@/components/ProfileSectionNav";

const SECTIONS = [
  { id: "kills", label: "Kills" },
  { id: "battles", label: "Battles" },
] as const;

export function AllianceProfileNav() {
  return <ProfileSectionNav sections={SECTIONS} />;
}
