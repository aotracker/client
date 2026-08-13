"use client";

import Image from "next/image";
import { useState } from "react";
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
  const label = tooltip ?? alt ?? formatItemName(itemType);
  const primary = itemIconUrl(itemType, quality);
  const fallback = itemIconRemoteUrl(itemType, quality);
  const [src, setSrc] = useState(primary);
  const optimizeRemote = src.startsWith("https://render.albiononline.com/");

  return (
    <span
      title={tooltip ?? (alt && alt !== "weapon" ? alt : undefined)}
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
        sizes={fill ? "64px" : undefined}
        className={cn("block", className)}
        unoptimized={!optimizeRemote}
        onError={() => {
          if (src !== fallback) setSrc(fallback);
        }}
      />
    </span>
  );
}
