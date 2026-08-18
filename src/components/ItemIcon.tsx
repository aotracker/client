"use client";

import Image from "next/image";
import { memo, useState } from "react";
import { cn, formatItemName } from "@/lib/utils";
import { itemIconRemoteUrl, itemIconUrl } from "@/lib/item-icons";

interface ItemIconProps {
  itemType: string;
  quality?: number | null;
  alt?: string;
  tooltip?: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

function GenericItemPlaceholder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-full text-muted-foreground/50", className)}
      aria-hidden
      focusable="false"
    >
      <rect
        x="2.75"
        y="2.75"
        width="18.5"
        height="18.5"
        rx="3"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M12 7.25 16.75 12 12 16.75 7.25 12 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const ItemIcon = memo(function ItemIcon({
  itemType,
  quality,
  alt,
  tooltip,
  className = "object-contain",
  fill,
  width,
  height,
}: ItemIconProps) {
  const label = tooltip ?? alt ?? formatItemName(itemType);
  const primary = itemIconUrl(itemType, quality);
  const fallback = itemIconRemoteUrl(itemType, quality);
  const [src, setSrc] = useState<string | null>(primary);
  const [failed, setFailed] = useState(!primary);
  const showImage = !failed && Boolean(src);

  return (
    <span
      title={label}
      className={cn("relative", fill ? "block size-full" : "block")}
      style={!fill && width && height ? { width, height } : undefined}
    >
      {showImage && src ? (
        <Image
          src={src}
          alt={alt ?? label}
          title={label}
          fill={fill}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          sizes={fill ? "64px" : undefined}
          className={cn("block", className)}
          unoptimized
          onError={() => {
            if (fallback && src !== fallback) {
              setSrc(fallback);
              return;
            }
            setFailed(true);
          }}
        />
      ) : (
        <GenericItemPlaceholder />
      )}
    </span>
  );
});
