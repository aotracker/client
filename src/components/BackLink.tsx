"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackLinkProps {
  className?: string;
  children?: React.ReactNode;
  fallbackHref?: string;
}

export function BackLink({
  className,
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={cn("gap-1.5", className)}
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children ?? t("goBack")}
    </Button>
  );
}
