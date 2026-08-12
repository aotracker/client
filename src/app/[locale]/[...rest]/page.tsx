import { notFound } from "next/navigation";

/** Catch unmatched paths under `[locale]` and render `not-found.tsx`. */
export default function CatchAllPage() {
  notFound();
}
