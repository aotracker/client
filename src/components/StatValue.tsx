import { cn, formatItemPower } from "@/lib/utils";

export type StatVariant = "kill" | "death" | "fame" | "ip" | "neutral";
export type StatSize = "inline" | "header" | "table";

const variantClasses: Record<StatVariant, string> = {
  kill: "text-stat-kill",
  death: "text-stat-death",
  fame: "text-stat-fame",
  ip: "text-stat-ip",
  neutral: "text-stat-neutral",
};

export function statVariantClass(variant: StatVariant, className?: string) {
  return cn(variantClasses[variant], className);
}

export function statHeaderClass(variant: StatVariant) {
  if (variant === "kill") return "text-stat-kill/70";
  if (variant === "death") return "text-stat-death/70";
  if (variant === "fame") return "text-stat-fame/70";
  if (variant === "ip") return "text-stat-ip/70";
  return "text-muted-foreground";
}

/** Colored item-power value using the site IP color (`text-stat-ip`). */
export function ItemPowerValue({
  value,
  className,
  withSuffix = true,
}: {
  value: string | number | null | undefined;
  className?: string;
  withSuffix?: boolean;
}) {
  const formatted =
    typeof value === "string"
      ? value.trim() || null
      : formatItemPower(value);
  if (!formatted) return null;

  return (
    <span className={cn("tabular-nums font-medium text-stat-ip", className)}>
      {formatted}
      {withSuffix ? " IP" : null}
    </span>
  );
}

interface StatValueProps {
  label?: string;
  value: string;
  variant?: StatVariant;
  size?: StatSize;
  className?: string;
  valueClassName?: string;
}

export function StatValue({
  label,
  value,
  variant = "neutral",
  size = "inline",
  className,
  valueClassName,
}: StatValueProps) {
  const valueClasses = cn(
    "tabular-nums",
    variantClasses[variant],
    size === "inline" && "font-semibold",
    size === "header" && "text-lg font-bold sm:text-2xl",
    size === "table" && "font-medium",
    valueClassName
  );

  if (size === "table" || !label) {
    return <span className={cn(valueClasses, className)}>{value}</span>;
  }

  const labelClasses =
    size === "header"
      ? "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      : "text-xs font-medium uppercase tracking-wide text-muted-foreground";

  return (
    <div className={cn(size === "header" && "text-center", "min-w-0", className)}>
      <p className={cn(labelClasses, "truncate")}>{label}</p>
      <p className={cn(size === "header" ? "mt-1" : "", valueClasses, "truncate")}>
        {value}
      </p>
    </div>
  );
}
