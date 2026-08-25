import { NextResponse } from "next/server";
import { getLinkedProviders, getSession } from "@/lib/auth";
import { displayableAccountEmail } from "@/lib/auth-email";
import {
  getUserPreferredRegion,
  getUserSyncedCounts,
} from "@/lib/db/user-data";

/** Current user profile + linked OAuth providers. Never returns Discord placeholder email. */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [providers, preferredRegion, counts] = await Promise.all([
    getLinkedProviders(session.user.id),
    getUserPreferredRegion(session.user.id),
    getUserSyncedCounts(session.user.id),
  ]);
  const providerIds = providers.map((p) => p.providerId);

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: displayableAccountEmail(session.user.email, providerIds),
      image: session.user.image,
      isAdmin: Boolean((session.user as { isAdmin?: boolean }).isAdmin),
      preferredRegion,
    },
    providers: providerIds,
    accounts: providers,
    watchlistCount: counts.watchlistCount,
    recentSearchCount: counts.recentSearchCount,
  });
}
