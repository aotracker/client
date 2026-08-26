import { Link } from "@/i18n/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Compact AOT monogram. */
export function BrandMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  const mark = (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card font-display text-xs font-bold tracking-wide text-foreground",
        className
      )}
      aria-hidden={title ? undefined : true}
    >
      AOT
    </span>
  );

  if (!title) return mark;

  return <Tooltip content={title}>{mark}</Tooltip>;
}

interface BrandLogoProps {
  className?: string;
  href?: string;
  markOnly?: boolean;
  size?: "sm" | "md";
}

export function BrandLogo({
  className,
  href = "/",
  markOnly = false,
  size = "md",
}: BrandLogoProps) {
  const content = (
    <>
      <BrandMark
        className={cn(
          size === "sm" ? "size-7 text-xs" : "size-8 text-xs"
        )}
      />
      {!markOnly && (
        <span
          className={cn(
            "font-display font-bold leading-none tracking-tight",
            size === "sm" ? "text-base" : "text-lg"
          )}
        >
          <span>AO</span>
          <span className="text-primary">Tracker</span>
        </span>
      )}
    </>
  );

  if (!href) {
    return (
      <span className={cn("inline-flex items-center gap-2.5", className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
      aria-label={SITE_NAME}
    >
      {content}
    </Link>
  );
}
