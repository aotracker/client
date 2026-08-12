"use client";

import { useEffect } from "react";

/** Syncs `<html lang>` with the active locale (root layout defaults to `en`). */
export function DocumentLang({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
