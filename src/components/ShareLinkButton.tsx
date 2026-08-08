"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  label = "Copy link",
}: ShareLinkButtonProps) {
  const { toast } = useToast();

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
      toast("Link copied");
    } catch {
      try {
        const input = document.createElement("input");
        input.value = href;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        toast("Link copied");
      } catch {
        toast("Could not copy link");
      }
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      title="Copy this page's link to the clipboard"
      aria-label={label}
      onClick={() => void handleCopy()}
    >
      <Copy className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
