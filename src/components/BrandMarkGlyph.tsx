/** Radar ping — the AOTracker mark. */
export function BrandMarkGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.25"
      />
      <path
        fill="currentColor"
        d="M12 12 12 4.15 A7.85 7.85 0 0 1 18.43 7.5 Z"
      />
      <circle cx="12" cy="12" r="2.15" fill="currentColor" />
    </svg>
  );
}
