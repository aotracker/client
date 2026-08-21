"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Skull, Swords, Users } from "lucide-react";
import {
  ProfileSectionNav,
  type ProfileNavSection,
} from "@/components/ProfileSectionNav";

interface FeudProfileNavProps {
  showTopPlayers?: boolean;
  showGuildFeuds?: boolean;
}

export function FeudProfileNav({
  showTopPlayers = false,
  showGuildFeuds = false,
}: FeudProfileNavProps) {
  const t = useTranslations("Feud.nav");

  const sections = useMemo(() => {
    const items: ProfileNavSection[] = [
      { id: "scoreboard", label: t("scoreboard"), icon: BarChart3 },
    ];

    if (showTopPlayers) {
      items.push({ id: "top-players", label: t("topPlayers"), icon: Users });
    }

    if (showGuildFeuds) {
      items.push({ id: "guild-feuds", label: t("guildFeuds"), icon: Swords });
    }

    items.push({ id: "kills", label: t("kills"), icon: Skull });

    return items;
  }, [showGuildFeuds, showTopPlayers, t]);

  return (
    <ProfileSectionNav sections={sections} ariaLabel={t("ariaLabel")} />
  );
}
