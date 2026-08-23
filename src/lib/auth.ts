import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  resolveAuthBaseUrl,
  resolveAuthTrustedOrigins,
} from "@/lib/auth-url";

function discordClientConfigured(): boolean {
  return Boolean(
    process.env.DISCORD_CLIENT_ID?.trim() &&
      process.env.DISCORD_CLIENT_SECRET?.trim()
  );
}

function googleClientConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

function buildSocialProviders() {
  const providers: NonNullable<
    Parameters<typeof betterAuth>[0]["socialProviders"]
  > = {};

  if (discordClientConfigured()) {
    providers.discord = {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      // Better Auth defaults to identify+email; disable so we only request identify
      disableDefaultScope: true,
      scope: ["identify"],
      mapProfileToUser(profile) {
        const username =
          typeof profile.username === "string" && profile.username
            ? profile.username
            : `discord_${profile.id}`;
        return {
          name: username,
          // Email scope not requested; Better Auth still requires an email column.
          email: `discord_${profile.id}@users.discord.local`,
          image:
            typeof profile.image_url === "string"
              ? profile.image_url
              : profile.avatar
                ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                : undefined,
          emailVerified: false,
        };
      },
    };
  }

  if (googleClientConfigured()) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    };
  }

  return providers;
}

async function maybeBootstrapAdmin(account: {
  providerId: string;
  accountId: string;
  userId: string;
}) {
  const [existingAdmin] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.isAdmin, true))
    .limit(1);
  if (existingAdmin) return;

  if (account.providerId === "discord") {
    const bootstrap = process.env.BOOTSTRAP_ADMIN_DISCORD_ID?.trim();
    if (!bootstrap || account.accountId !== bootstrap) return;
  } else if (account.providerId === "google") {
    const bootstrap = process.env.BOOTSTRAP_ADMIN_GOOGLE_ID?.trim();
    if (!bootstrap || account.accountId !== bootstrap) return;
  } else {
    return;
  }

  await db
    .update(schema.user)
    .set({ isAdmin: true, updatedAt: new Date() })
    .where(eq(schema.user.id, account.userId));
}

export const auth = betterAuth({
  baseURL: resolveAuthBaseUrl(),
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: resolveAuthTrustedOrigins(),
  advanced: {
    trustedProxyHeaders: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: buildSocialProviders(),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["discord", "google"],
      // Discord uses a synthetic unverified email; still allow linking.
      allowDifferentEmails: true,
    },
  },
  user: {
    additionalFields: {
      isAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      preferredRegion: {
        type: "string",
        required: false,
        defaultValue: null,
        input: true,
      },
    },
  },
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          await maybeBootstrapAdmin(account);
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

/** Server-side session helper for RSC / route handlers. */
export async function getSession() {
  const { headers } = await import("next/headers");
  return auth.api.getSession({ headers: await headers() });
}

/** Look up Discord snowflake for a site user (for promote/admin tooling). */
export async function getDiscordAccountId(
  userId: string
): Promise<string | null> {
  const [row] = await db
    .select({ accountId: schema.account.accountId })
    .from(schema.account)
    .where(
      and(
        eq(schema.account.userId, userId),
        eq(schema.account.providerId, "discord")
      )
    )
    .limit(1);
  return row?.accountId ?? null;
}

/** Linked OAuth providers for a user (discord / google). */
export async function getLinkedProviders(
  userId: string
): Promise<Array<{ providerId: string; accountId: string }>> {
  const rows = await db
    .select({
      providerId: schema.account.providerId,
      accountId: schema.account.accountId,
    })
    .from(schema.account)
    .where(eq(schema.account.userId, userId));
  return rows.filter(
    (row) => row.providerId === "discord" || row.providerId === "google"
  );
}

export function isDiscordAuthConfigured(): boolean {
  return (
    discordClientConfigured() && Boolean(process.env.BETTER_AUTH_SECRET?.trim())
  );
}

export function isGoogleAuthConfigured(): boolean {
  return (
    googleClientConfigured() && Boolean(process.env.BETTER_AUTH_SECRET?.trim())
  );
}

export function isSocialAuthConfigured(): boolean {
  return isDiscordAuthConfigured() || isGoogleAuthConfigured();
}
