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
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
]);

export default eslintConfig;
