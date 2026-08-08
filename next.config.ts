import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  // Inline DISABLED_REGIONS into client bundles so ENABLED_REGIONS matches SSR.
  env: {
    DISABLED_REGIONS: process.env.DISABLED_REGIONS ?? "",
  },
  transpilePackages: ["@aotracker/core"],
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      "@aotracker/core": "./packages/core/src",
      "drizzle-orm": "./node_modules/drizzle-orm",
      "postgres": "./node_modules/postgres",
      "uuid": "./node_modules/uuid",
    },
  },
  allowedDevOrigins: ["10.1.1.10"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "render.albiononline.com",
        pathname: "/v1/item/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/sitemaps/:id.xml",
        destination: "/sitemaps/:id",
      },
    ];
  },
};

export default nextConfig;
