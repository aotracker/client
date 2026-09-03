"use client";

import { useTranslations } from "next-intl";
import { Radio, Skull, Swords } from "lucide-react";
import {
  ProfileSectionNav,
  type ProfileNavSection,
} from "@/components/ProfileSectionNav";

export function AllianceProfileNav({ hasMedia }: { hasMedia: boolean }) {
  const t = useTranslations("Alliance.nav");

  const sections: ProfileNavSection[] = [
    { id: "kills", label: t("kills"), icon: Skull },
    { id: "battles", label: t("battles"), icon: Swords },
    ...(hasMedia ? [{ id: "media", label: t("media"), icon: Radio }] : []),
  ];

  return <ProfileSectionNav sections={sections} />;
}
