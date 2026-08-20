"use client";

import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

interface ShareLinkButtonProps {
  /** Absolute URL preferred; path is resolved against window.location.origin. */
  url?: string;
  path?: string;
  className?: string;
  label?: string;
}

export function ShareLinkButton({
  url,
  path,
  className,
  label,
}: ShareLinkButtonProps) {
  const { toast } = useToast();
  const t = useTranslations("Common");
  const resolvedLabel = label ?? t("buttons.copyLink");

  async function handleCopy() {
    const href =
      url ??
      (path
        ? `${typeof window !== "undefined" ? window.location.origin : ""}${
            path.startsWith("/") ? path : `/${path}`
          }`
        : typeof window !== "undefined"
          ? window.location.href
          : "");

    if (!href) return;

    try {
      await navigator.clipboard.writeText(href);
      toast(t("toasts.linkCopied"));
    } catch {
      try {
        const input = document.createElement("input");
        input.value = href;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        toast(t("toasts.linkCopied"));
      } catch {
        toast(t("toasts.couldNotCopyLink"));
      }
    }
  }

  return (
    <Tooltip content={t("labels.copyLinkTitle")} side="bottom">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("gap-1.5", className)}
        aria-label={resolvedLabel}
        onClick={() => void handleCopy()}
      >
        <Copy className="h-3.5 w-3.5" />
        {resolvedLabel}
      </Button>
    </Tooltip>
  );
}
