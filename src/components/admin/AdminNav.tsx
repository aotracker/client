"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  LayoutDashboard,
  Radio,
  ScrollText,
  Server,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}> = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/errors", label: "Errors", icon: AlertTriangle },
  { href: "/admin/api-logs", label: "API Logs", icon: ScrollText },
  { href: "/admin/system", label: "System", icon: Server },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/media", label: "Media", icon: Radio },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/actions", label: "Actions", icon: Zap },
];

export function AdminNav({
  orientation = "vertical",
}: {
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const horizontal = orientation === "horizontal";

  return (
    <nav
      aria-label="Admin"
      className={cn(
        horizontal
          ? "-mx-1 flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex flex-col gap-1"
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors",
              horizontal
                ? "shrink-0 px-3 py-1.5"
                : "px-3 py-2",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
