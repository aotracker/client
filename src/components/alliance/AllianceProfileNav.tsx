"use client";

import { useTranslations } from "next-intl";
import {
  ProfileSectionNav,
  type ProfileNavSection,
} from "@/components/ProfileSectionNav";

export function AllianceProfileNav() {
  const t = useTranslations("Alliance.nav");

  const sections: ProfileNavSection[] = [
    { id: "kills", label: t("kills") },
    { id: "battles", label: t("battles") },
  ];

  return <ProfileSectionNav sections={sections} />;
}
