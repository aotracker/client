"use client";

import { useTranslations } from "next-intl";
import {
  ProfileSectionNav,
  type ProfileNavSection,
} from "@/components/ProfileSectionNav";

export function PlayerProfileNav() {
  const t = useTranslations("Player.nav");

  const sections: ProfileNavSection[] = [
    { id: "activity", label: t("activity") },
    { id: "analytics", label: t("analytics") },
    { id: "allies", label: t("allies") },
  ];

  return <ProfileSectionNav sections={sections} />;
}
