import { getTranslations } from "next-intl/server";
import { Tooltip } from "@/components/ui/tooltip";
import { cn, formatSilver } from "@/lib/utils";
import { AlbionKillboardIcon } from "@/components/AlbionKillboardIcon";

export function SilverIcon({ className }: { className?: string }) {
  return (
    <AlbionKillboardIcon icon="silver" className={cn("size-3.5", className)} />
  );
}

export async function SilverValue({
  amount,
  prefix,
  className,
  iconClassName,
}: {
  amount: number;
  prefix?: string;
  className?: string;
  iconClassName?: string;
}) {
  const t = await getTranslations("Common.labels");

  return (
    <Tooltip content={t("estimated")}>
      <span className={cn("inline-flex items-center gap-1", className)}>
        {prefix ? <span>{prefix}</span> : null}
        <SilverIcon className={iconClassName} />
        <span className="tabular-nums">{formatSilver(amount)}</span>
      </span>
    </Tooltip>
  );
}
