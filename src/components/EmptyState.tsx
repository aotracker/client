import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  children,
  className,
  bordered = true,
}: {
  icon: LucideIcon;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground",
        bordered && "rounded-md border border-border bg-card",
        className
      )}
    >
      <Icon className="h-8 w-8 shrink-0 text-muted-foreground/60" aria-hidden />
      {title ? <p className="font-medium text-foreground">{title}</p> : null}
      {children != null ? (
        <div className={title ? "text-sm" : undefined}>{children}</div>
      ) : null}
    </div>
  );
}
