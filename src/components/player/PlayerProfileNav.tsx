"use client";

import { useTranslations } from "next-intl";
import { Activity, ChartColumn, Users } from "lucide-react";
import {
  ProfileSectionNav,
  type ProfileNavSection,
} from "@/components/ProfileSectionNav";

export function PlayerProfileNav() {
  const t = useTranslations("Player.nav");

  const sections: ProfileNavSection[] = [
    { id: "activity", label: t("activity"), icon: Activity },
    { id: "analytics", label: t("analytics"), icon: ChartColumn },
    { id: "allies", label: t("allies"), icon: Users },
  ];

  return <ProfileSectionNav sections={sections} />;
}
