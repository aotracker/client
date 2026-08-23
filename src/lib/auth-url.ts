/** Canonical Better Auth base URL (no trailing slash). */
export function resolveAuthBaseUrl(): string | undefined {
  const raw =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/+$/, "");
}

function addTrustedOrigin(origins: Set<string>, raw: string) {
  const value = raw.trim();
  if (!value) return;
  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      origins.add(new URL(value).origin);
      return;
    }
    origins.add(`https://${value.replace(/^\/+|\/+$/g, "")}`);
  } catch {
    // ignore invalid entries
  }
}

/** Extra trusted browser origins for OAuth callback URLs (www + apex, etc.). */
export function resolveAuthTrustedOrigins(): string[] {
  const origins = new Set<string>();
  const base = resolveAuthBaseUrl();
  if (base) {
    try {
      origins.add(new URL(base).origin);
    } catch {
      // ignore
    }
  }

  for (const raw of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_TRUSTED_ORIGINS,
  ]) {
    if (!raw?.trim()) continue;
    if (raw.includes(",")) {
      for (const part of raw.split(",")) addTrustedOrigin(origins, part);
    } else {
      addTrustedOrigin(origins, raw);
    }
  }

  return [...origins];
}
