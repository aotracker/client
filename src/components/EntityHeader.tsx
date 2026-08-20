import { Fragment, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  EntityStatStrip,
  type EntityStat,
} from "@/components/EntityStatStrip";
import { cn } from "@/lib/utils";

export type EntityAffiliation = {
  key: string;
  label: ReactNode;
  href?: string;
  title?: string;
};

interface EntityHeaderProps {
  title: string;
  /** Small type label above the title, e.g. Player / Guild / Alliance. */
  kind?: string;
  affiliations?: EntityAffiliation[];
  actions?: ReactNode;
  stats: EntityStat[];
  /** Left side of muted footer (founder, founded, synced, etc.). */
  footerMeta?: ReactNode;
  /** Right side of muted footer — typically Albion ID. */
  entityId?: string;
  entityIdLabel?: string;
  children?: ReactNode;
  className?: string;
}

async function AffiliationTrail({ items }: { items: EntityAffiliation[] }) {
  if (items.length === 0) return null;

  const t = await getTranslations("Common.a11y");

  return (
    <nav
      aria-label={t("entityLocation")}
      className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground"
    >
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 && (
            <span className="text-muted-foreground/50" aria-hidden>
              ›
            </span>
          )}
          {item.href ? (
            <Tooltip content={item.title}>
              <Link
                href={item.href}
                className="min-w-0 break-words hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {item.label}
              </Link>
            </Tooltip>
          ) : item.title ? (
            <Tooltip content={item.title}>
              <span className="min-w-0 break-words">{item.label}</span>
            </Tooltip>
          ) : (
            <span className="min-w-0 break-words">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

export async function EntityHeader({
  title,
  kind,
  affiliations = [],
  actions,
  stats,
  footerMeta,
  entityId,
  entityIdLabel,
  children,
  className,
}: EntityHeaderProps) {
  const t = await getTranslations("Common.labels");
  const resolvedIdLabel = entityIdLabel ?? t("albionId");
  const hasFooter = Boolean(footerMeta) || Boolean(entityId);

  return (
    <Card className={className}>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {kind ? (
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {kind}
              </p>
            ) : null}
            <h1 className="font-display break-words text-xl font-semibold leading-tight tracking-tight sm:text-2xl sm:leading-none">
              {title}
            </h1>
            <AffiliationTrail items={affiliations} />
          </div>
          {actions}
        </div>

        <EntityStatStrip stats={stats} />
      </CardHeader>

      {children}

      {hasFooter && (
        <CardContent
          className={cn(
            "border-t border-border/40 pt-4",
            "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          )}
        >
          <div className="min-w-0 flex-1 space-y-1 text-sm text-muted-foreground">
            {footerMeta}
          </div>
          {entityId && (
            <Tooltip content={resolvedIdLabel}>
              <span className="break-all font-mono text-xs text-muted-foreground/70 sm:max-w-[50%] sm:text-right">
                {entityId}
              </span>
            </Tooltip>
          )}
        </CardContent>
      )}
    </Card>
  );
}
