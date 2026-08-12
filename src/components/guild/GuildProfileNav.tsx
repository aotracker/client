"use client";

import { useTranslations } from "next-intl";
import {
  ProfileSectionNav,
  type ProfileNavSection,
} from "@/components/ProfileSectionNav";

export function GuildProfileNav() {
  const t = useTranslations("Guild.nav");

  const sections: ProfileNavSection[] = [
    { id: "kills", label: t("kills") },
    { id: "rivals", label: t("rivals") },
    { id: "battles", label: t("battles") },
  ];

  return <ProfileSectionNav sections={sections} />;
}
