"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LoginButtonsEnglish } from "@/components/auth/LoginButtons";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

/**
 * Admin gate copy is English-only. Public account/login surfaces keep next-intl.
 */
export function AdminLoginRequired() {
  const { data: session, isPending } = useSession();
  const signedIn = Boolean(session?.user);
  const isAdmin = session?.user?.isAdmin === true;
  const displayName =
    session?.user?.name ?? session?.user?.email ?? "Signed-in user";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Admin access required
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {signedIn && !isAdmin
            ? "Your account is signed in but is not an admin. Ask an operator to promote your user."
            : "Sign in with Discord or Google. Admin access is granted manually after your first login."}
        </p>
      </div>
      <Card>
        <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
          {isPending ? (
            <p>Loading…</p>
          ) : signedIn ? (
            <div className="space-y-3">
              <p>
                Signed in as {displayName}
                {!isAdmin ? " — not an admin." : null}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void authClient.signOut()}
              >
                Sign out
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <LoginButtonsEnglish callbackURL="/admin" size="sm" />
              <p className="text-[11px]">
                <Link
                  href="/login?next=/admin"
                  className="text-primary hover:underline"
                >
                  Open full login page
                </Link>
              </p>
            </div>
          )}
          <p>
            Public health stays available at{" "}
            <a href="/health" className="text-primary hover:underline">
              /health
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
