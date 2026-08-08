"use client";

import { useRouter } from "next/navigation";

interface BackLinkProps {
  className?: string;
  children?: React.ReactNode;
  fallbackHref?: string;
}

export function BackLink({
  className = "text-sm text-muted-foreground hover:text-foreground",
  children = "← Back",
  fallbackHref = "/",
}: BackLinkProps) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`cursor-pointer rounded-sm bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      {children}
    </button>
  );
}
