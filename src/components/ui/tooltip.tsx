"use client";

import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

interface TooltipProps {
  content?: string | null;
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  block?: boolean;
  style?: CSSProperties;
}

const ALIGN_CLASS = {
  start: "left-0 translate-x-0 text-left",
  center: "left-1/2 -translate-x-1/2 text-center",
  end: "right-0 translate-x-0 text-left",
} as const;

export function Tooltip({
  content,
  children,
  className,
  side = "top",
  align = "center",
  block = false,
  style,
}: TooltipProps) {
  if (!content) return <>{children}</>;

  return (
    <span
      className={cn(
        "group/tooltip relative max-w-full cursor-pointer",
        block ? "block" : "inline-flex",
        className
      )}
      style={style}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 w-max max-w-[min(16rem,calc(100vw-2rem))]",
          "rounded-md border border-border/70 bg-card/95 px-2.5 py-1.5",
          "text-xs leading-snug text-foreground/90 shadow-md backdrop-blur-sm",
          "whitespace-pre-line",
          "opacity-0 transition-opacity duration-150",
          "group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          ALIGN_CLASS[align],
          side === "top"
            ? "bottom-[calc(100%+0.375rem)]"
            : "top-[calc(100%+0.375rem)]"
        )}
      >
        {content}
      </span>
    </span>
  );
}
