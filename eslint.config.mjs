import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/albion/client",
              message:
                "Do not call the Albion gameinfo API from the Vercel client. Use ingest jobs instead.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/gameinfo(-ams|-sgp)?\\.albiononline\\.com/]",
          message:
            "Do not reference Albion gameinfo hostnames in the client. Use ingest workers.",
        },
      ],
      // New in eslint-plugin-react-hooks v7 — flags common pre-existing patterns.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    ignores: ["src/components/KillGearPanels.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/albion/client",
              message:
                "Do not call the Albion gameinfo API from the Vercel client. Use ingest jobs instead.",
            },
            {
              name: "@/lib/items/catalog",
              allowTypeImports: true,
              message:
                "Do not import item catalogs into client components. Pass precomputed display names from the server.",
            },
            {
              name: "@/lib/items/item-meta",
              allowTypeImports: true,
              message:
                "Do not import item-meta into client components. Pass armor class from the server.",
            },
            {
              name: "@/lib/items/weapon-roles",
              allowTypeImports: true,
              message:
                "Do not import weapon-roles into client components. Pass role from the server.",
            },
            {
              name: "@/lib/items/build-display",
              allowTypeImports: true,
              message:
                "Do not import build-display into client components. Pass precomputed labels from the server.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
]);

export default eslintConfig;
