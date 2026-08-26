import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "zvz" | "group" | "solo" | "outline" | "success";
  size?: "default" | "sm";
}

const variants = {
  default: "bg-primary/20 text-primary border-primary/30",
  zvz: "bg-zvz/20 text-zvz border-zvz/40",
  group: "bg-group/20 text-group border-group/40",
  solo: "bg-solo/20 text-solo border-solo/40",
  outline: "bg-transparent text-muted-foreground border-border",
  success: "bg-stat-kill/20 text-stat-kill border-stat-kill/40",
};

const sizes = {
  default: "px-2 py-0.5 text-xs",
  sm: "px-1.5 py-0 text-xs leading-tight",
};

export function Badge({
  children,
  className,
  variant = "default",
  size = "default",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        sizes[size],
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
