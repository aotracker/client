"use client";

import { useTranslations } from "next-intl";
import { Activity, Radio, Skull, Swords, Target } from "lucide-react";
import {
  ProfileSectionNav,
  type ProfileNavSection,
} from "@/components/ProfileSectionNav";

export function GuildProfileNav({ hasMedia }: { hasMedia: boolean }) {
  const t = useTranslations("Guild.nav");

  const sections: ProfileNavSection[] = [
    { id: "activity", label: t("activity"), icon: Activity },
    { id: "kills", label: t("kills"), icon: Skull },
    { id: "battles", label: t("battles"), icon: Swords },
    { id: "rivals", label: t("rivals"), icon: Target },
    ...(hasMedia ? [{ id: "media", label: t("media"), icon: Radio }] : []),
  ];

  return <ProfileSectionNav sections={sections} />;
}
