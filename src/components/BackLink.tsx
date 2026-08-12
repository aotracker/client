"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

interface BackLinkProps {
  className?: string;
  children?: React.ReactNode;
  fallbackHref?: string;
}

export function BackLink({
  className = "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground",
  children,
  fallbackHref = "/",
}: BackLinkProps) {
  const router = useRouter();
  const t = useTranslations("Common.buttons");

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`cursor-pointer rounded-sm bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children ?? t("back")}
    </button>
  );
}
