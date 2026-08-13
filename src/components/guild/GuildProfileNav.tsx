"use client";

import { useTranslations } from "next-intl";
import { Activity, Swords } from "lucide-react";
import {
  ProfileSectionNav,
  type ProfileNavSection,
} from "@/components/ProfileSectionNav";

export function GuildProfileNav() {
  const t = useTranslations("Guild.nav");

  const sections: ProfileNavSection[] = [
    { id: "activity", label: t("activity"), icon: Activity },
    { id: "kills", label: t("kills"), icon: Swords },
    { id: "battles", label: t("battles"), icon: Swords },
    { id: "rivals", label: t("rivals"), icon: Swords },
  ];

  return <ProfileSectionNav sections={sections} />;
}
