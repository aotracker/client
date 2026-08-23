import { NextResponse } from "next/server";
import { getLinkedProviders, getSession } from "@/lib/auth";
import { getUserPreferredRegion } from "@/lib/db/user-data";

/** Current user profile + linked OAuth providers. */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [providers, preferredRegion] = await Promise.all([
    getLinkedProviders(session.user.id),
    getUserPreferredRegion(session.user.id),
  ]);

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      isAdmin: Boolean((session.user as { isAdmin?: boolean }).isAdmin),
      preferredRegion,
    },
    providers: providers.map((p) => p.providerId),
    accounts: providers,
  });
}
