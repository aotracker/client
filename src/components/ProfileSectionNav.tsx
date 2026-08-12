"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ProfileNavSection = {
  id: string;
  label: string;
};

/** Sticky under the site navbar (~57px). Keep in sync with Navbar height. */
const STICKY_TOP_CLASS = "top-[57px]";

export function ProfileSectionNav({
  sections,
  ariaLabel = "Profile sections",
}: {
  sections: readonly ProfileNavSection[];
  ariaLabel?: string;
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el != null);

    if (elements.length === 0) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }

        let bestId: string | null = null;
        let bestRatio = -1;
        for (const section of sections) {
          const ratio = visible.get(section.id) ?? -1;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = section.id;
          }
        }
        if (bestId) setActiveId(bestId);
      },
      {
        // Prefer the section occupying the upper mid viewport beneath sticky chrome.
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75],
      }
    );

    for (const el of elements) observer.observe(el);

    const hash = window.location.hash.replace(/^#/, "");
    if (sections.some((s) => s.id === hash)) {
      setActiveId(hash);
    }

    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "sticky z-40 -mx-4 border-b border-border/60 bg-background/95 px-4 backdrop-blur",
        STICKY_TOP_CLASS
      )}
    >
      <div className="flex gap-1 overflow-x-auto py-2" role="list">
        {sections.map((section) => {
          const isActive = activeId === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              role="listitem"
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {section.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
