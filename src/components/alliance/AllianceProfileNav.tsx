"use client";

import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";
import {
  ProfileSectionNav,
  type ProfileNavSection,
} from "@/components/ProfileSectionNav";

export function AllianceProfileNav() {
  const t = useTranslations("Alliance.nav");

  const sections: ProfileNavSection[] = [
    { id: "kills", label: t("kills"), icon: Swords },
    { id: "battles", label: t("battles"), icon: Swords },
  ];

  return <ProfileSectionNav sections={sections} />;
}
