import { NextResponse } from "next/server";
import { displayableAccountEmail } from "@/lib/auth-email";
import { getLinkedProviders } from "@/lib/auth";
import { requireUser } from "@/lib/api-route";
import {
  getUserPreferredRegion,
  getUserSyncedCounts,
} from "@/lib/db/user-data";

/** Current user profile + linked OAuth providers. Never returns Discord placeholder email. */
export async function GET() {
  const authz = await requireUser();
  if (!authz.ok) return authz.response;

  const [providers, preferredRegion, counts] = await Promise.all([
    getLinkedProviders(authz.userId),
    getUserPreferredRegion(authz.userId),
    getUserSyncedCounts(authz.userId),
  ]);
  const providerIds = providers.map((p) => p.providerId);

  return NextResponse.json({
    user: {
      id: authz.userId,
      name: authz.session.user.name,
      email: displayableAccountEmail(authz.session.user.email, providerIds),
      image: authz.session.user.image,
      isAdmin: Boolean((authz.session.user as { isAdmin?: boolean }).isAdmin),
      preferredRegion,
    },
    providers: providerIds,
    accounts: providers,
    watchlistCount: counts.watchlistCount,
    recentSearchCount: counts.recentSearchCount,
  });
}
