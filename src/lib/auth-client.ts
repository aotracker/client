"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        isAdmin: {
          type: "boolean",
        },
      },
    }),
  ],
});

export const {
  signIn,
  signOut,
  useSession,
} = authClient;
