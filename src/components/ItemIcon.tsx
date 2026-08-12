"use client";

import Image from "next/image";
import { useState } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { formatItemTooltip } from "@/lib/items/catalog";
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

export function ItemIcon({
  itemType,
  quality,
  alt,
  tooltip,
  className = "object-contain",
  fill,
  width,
  height,
}: ItemIconProps) {
  const locale = useLocale();
  const label = tooltip ?? formatItemTooltip(itemType, locale);
  const primary = itemIconUrl(itemType, quality);
  const fallback = itemIconRemoteUrl(itemType, quality);
  const [src, setSrc] = useState(primary);

  return (
    <span
      title={label}
      className={cn(
        "relative",
        fill ? "block size-full" : "block"
      )}
      style={!fill && width && height ? { width, height } : undefined}
    >
      <Image
        src={src}
        alt={alt ?? label}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        className={cn("block", className)}
        unoptimized
        onError={() => {
          if (src !== fallback) setSrc(fallback);
        }}
      />
    </span>
  );
}
