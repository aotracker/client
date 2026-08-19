/** URL token from a catalog family name: "Heavy Mace" → "heavy-mace". */
export function weaponNameSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** English family name for `?weapon=` (spaces become `+` in the query string). */
export function weaponFilterParam(
  names: Record<string, string> | undefined,
  familyKey: string
): string {
  const name = names?.en?.trim();
  return name || familyKey;
}
