import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inline DISABLED_REGIONS into client bundles so ENABLED_REGIONS matches SSR.
  env: {
    DISABLED_REGIONS: process.env.DISABLED_REGIONS ?? "",
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
