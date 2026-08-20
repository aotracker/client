"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, Languages } from "lucide-react";
import { LOCALE_DEFINITIONS, type AppLocale } from "@/i18n/locales";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  className?: string;
  /** Ghost trigger for use inside a shared toolbar. */
  compact?: boolean;
}

export function LanguageSelector({
  className,
  compact = false,
}: LanguageSelectorProps) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const active =
    LOCALE_DEFINITIONS.find((def) => def.code === locale) ??
    LOCALE_DEFINITIONS[0];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function switchLocale(next: AppLocale) {
    setOpen(false);
    if (next === locale) return;
    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    router.replace(href, { locale: next });
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Tooltip content={active.label} side="bottom">
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-0.5 rounded-md text-xs font-medium uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            compact
              ? "px-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              : "border border-border bg-transparent px-2.5 hover:bg-accent"
          )}
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-label={t("selectLanguage")}
          onClick={() => setOpen((value) => !value)}
        >
        <Languages className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        <span>{active.code}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 opacity-60 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      </Tooltip>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("selectLanguage")}
          className="absolute right-0 z-50 mt-1 min-w-[9.5rem] overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg"
        >
          {LOCALE_DEFINITIONS.map((def) => {
            const selected = def.code === locale;
            return (
              <li key={def.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                    selected && "bg-muted/60 font-medium"
                  )}
                  onClick={() => switchLocale(def.code)}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      selected ? "opacity-100 text-primary" : "opacity-0"
                    )}
                    aria-hidden
                  />
                  <span className="uppercase tabular-nums text-muted-foreground">
                    {def.code}
                  </span>
                  <span>{def.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
