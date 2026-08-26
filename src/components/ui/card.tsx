import { cn } from "@/lib/utils";

export type CardVariant = "default" | "muted";

export function Card({
  className,
  children,
  variant = "default",
}: {
  className?: string;
  children: React.ReactNode;
  variant?: CardVariant;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border text-card-foreground",
        variant === "default" && "bg-card",
        variant === "muted" && "bg-muted/15",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("flex flex-col gap-1 p-4 pb-2", className)}>{children}</div>;
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <h3 className={cn("text-lg font-semibold leading-none", className)}>{children}</h3>;
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("p-4 pt-0", className)}>{children}</div>;
}
