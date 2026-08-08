import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/** Consistent page-level h1 + optional description. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

/** Section with consistent h2 typography. */
export function PageSection({
  title,
  description,
  actions,
  children,
  className,
  titleClassName,
}: PageSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || description || actions) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h2 className={cn("font-display text-lg font-semibold", titleClassName)}>
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
