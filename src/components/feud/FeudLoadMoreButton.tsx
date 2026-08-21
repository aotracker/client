"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { FeudDaysFilter } from "@/lib/feud/params";

interface FeudLoadMoreButtonProps {
  days: FeudDaysFilter;
  offset: number;
  label: string;
}

export function FeudLoadMoreButton({
  days,
  offset,
  label,
}: FeudLoadMoreButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    const params = new URLSearchParams(searchParams.toString());
    if (days === 7) {
      params.delete("days");
    } else {
      params.set("days", String(days));
    }
    params.set("offset", String(offset));
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div className="flex justify-center pt-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={loadMore}
      >
        {isPending ? "Loading…" : label}
      </Button>
    </div>
  );
}
