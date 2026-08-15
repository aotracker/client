export function pickLocalizedName(
  names: Record<string, string> | undefined,
  locale: string,
  fallback: string
): string {
  return names?.[locale] ?? names?.en ?? fallback;
}
