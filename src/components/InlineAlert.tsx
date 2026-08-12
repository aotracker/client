import { AlertTriangle, CircleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function InlineAlert({
  variant = "danger",
  children,
  className,
  icon,
}: {
  variant?: "danger" | "warning";
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}) {
  const Icon = icon ?? (variant === "warning" ? AlertTriangle : CircleAlert);

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md p-4 text-sm",
        variant === "danger" ? "alert-danger" : "alert-warning",
        className
      )}
      role="alert"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
