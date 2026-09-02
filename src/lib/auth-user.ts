/** Display fields only — never pass the Better Auth session token to the client. */
export type PublicAuthUser = {
  id: string;
  name: string;
  image: string | null;
  isAdmin: boolean;
  providers: string[];
};

export function toPublicAuthUser(
  user:
    | {
        id: string;
        name: string;
        image?: string | null;
        isAdmin?: boolean | null;
      }
    | null
    | undefined,
  providers: string[] = []
): PublicAuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    image: user.image ?? null,
    isAdmin: Boolean(user.isAdmin),
    providers,
  };
}
