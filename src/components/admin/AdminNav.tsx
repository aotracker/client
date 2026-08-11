"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  exact?: boolean;
}> = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/errors", label: "Errors" },
  { href: "/admin/api-logs", label: "API Logs" },
  { href: "/admin/system", label: "System" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/actions", label: "Actions" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
