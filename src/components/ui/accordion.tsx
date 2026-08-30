import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Accordion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("divide-y divide-border overflow-hidden", className)}>
      {children}
    </Card>
  );
}

export function AccordionItem({
  children,
  className,
  defaultOpen = false,
}: {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details className={cn("group", className)} open={defaultOpen || undefined}>
      {children}
    </details>
  );
}

export function AccordionTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <summary
      className={cn(
        "flex cursor-pointer list-none items-center gap-3 px-4 py-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "hover:bg-accent/60 [&::-webkit-details-marker]:hidden",
        className
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <ChevronDown
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        aria-hidden
      />
    </summary>
  );
}

export function AccordionContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-2 px-4 pb-4", className)}>{children}</div>;
}
