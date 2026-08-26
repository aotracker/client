import { cn } from "@/lib/utils";

export type ControlSize = "sm" | "md";

/** Shared border/height/ring for Input and native select fallbacks. */
export function controlClassName({
  size = "md",
  className,
}: {
  size?: ControlSize;
  className?: string;
} = {}) {
  return cn(
    "flex w-full rounded-md border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
    size === "sm" && "h-8 px-3 text-xs",
    size === "md" && "h-10 px-3 py-2 text-sm",
    className
  );
}

export function Input({
  className,
  size = "md",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: ControlSize;
}) {
  return <input className={controlClassName({ size, className })} {...props} />;
}

/** Native select using the same control chrome as Input. Prefer FilterSelect when options are a short enum. */
export function Select({
  className,
  size = "md",
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  size?: ControlSize;
}) {
  return <select className={controlClassName({ size, className })} {...props} />;
}
