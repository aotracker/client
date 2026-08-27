import { getTranslations } from "next-intl/server";
import { AODP_HOME_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export async function AodpPriceCredit({ className }: { className?: string }) {
  const t = await getTranslations("Common.labels");

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {t.rich("pricesProvidedBy", {
        aodp: (chunks) => (
          <a
            href={AODP_HOME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {chunks}
          </a>
        ),
      })}
    </p>
  );
}
